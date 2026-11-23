import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { ResourceNotFoundException } from '@/common/exception/api.exception';
import type { Actor } from '@/common/security/actor';
import { Clock } from '@/common/time/clock';
import { LiveEventType } from '@/modules/event/service/live-event';
import { UserRole } from '@/modules/user/service/user-role';
import { ViewingStatus } from '@/modules/viewing/service/viewing-status';

import { MessageRepository } from '../repository/message.repository';
import type {
    MessageRecord,
    SupportParticipantsRecord,
    ViewingParticipantsRecord,
} from '../repository/record/message.record';
import { sideOf, toMessage } from './conversation-access';
import { ConversationQueryService } from './conversation-query.service';
import type {
    ConversationDetail,
    Message,
    ReadReceipt,
    SendMessageCommand,
    StartConversationCommand,
} from './message.types';
import { MessageError } from './message-errors';
import { MAX_OPEN_SUPPORT, MAX_THREAD_MESSAGES } from './message-limits';
import { MessageNotifier } from './message-notifier.service';
import { MessageSide, otherSide } from './message-side';

interface AppendedMessage {
    record: MessageRecord;
    unreadBefore: number;
    side: MessageSide;
}

interface ReadMarkers {
    requesterReadAt: Date | null;
    responderReadAt: Date | null;
}

const readMarkerOf = (markers: ReadMarkers, side: MessageSide): Date | null =>
    side === MessageSide.REQUESTER ? markers.requesterReadAt : markers.responderReadAt;

const assertUnderCap = (count: number): void => {
    if (count >= MAX_THREAD_MESSAGES) {
        throw MessageError.threadFull();
    }
};

/**
 * Conversations: one per viewing, between the tenant and the home's owner, opening when the
 * owner confirms (the user's rule: nobody can write to a stranger, so there is nothing to spam)
 * and closing, read only, when the viewing is cancelled; and a member's requests to Keyhaven,
 * which the staff answers and closes. Nothing is edited or deleted; the other side is emailed
 * about a new message only when they had nothing unread there; every open tab is told at once.
 */
@Injectable()
export class MessageService {
    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly conversationQueryService: ConversationQueryService,
        private readonly notifier: MessageNotifier,
        private readonly clock: Clock,
        @InjectPinoLogger(MessageService.name) private readonly logger: PinoLogger,
    ) {}

    /** A message from either side; DATA-14: the other side is told after commit and, when idle there, by email. */
    async send(command: SendMessageCommand, actor: Actor): Promise<Message> {
        const { record, unreadBefore, side } = await this.append(command, actor);
        const message = toMessage(record);
        const loaded = await this.conversationQueryService.load(command.conversationId);
        this.notifier.publish(loaded, otherSide(side), {
            type: LiveEventType.MESSAGE_CREATED,
            conversationId: command.conversationId,
        });
        if (unreadBefore === 0) {
            const conversation = this.conversationQueryService.toConversation(loaded, 0, actor);
            await this.notifier.emailNewMessage(loaded, otherSide(side), conversation, message);
        }
        return message;
    }

    /** A member writes to Keyhaven: a new request with its first message; the staff's tabs are told. */
    async start(command: StartConversationCommand, actor: Actor): Promise<ConversationDetail> {
        const id = await this.open(command, actor.userId);
        this.notifier.supportOpened(id);
        return this.conversationQueryService.find(id, actor);
    }

    /** The caller read the thread: safe to repeat; nothing to mark before the first message. */
    async markRead(conversationId: string, actor: Actor): Promise<ReadReceipt> {
        const now = this.clock.now();
        const loaded = await this.conversationQueryService.load(conversationId);
        const side = sideOf(loaded, actor);
        const isMarked = await this.messageRepository.markRead(conversationId, side, now);
        if (isMarked) {
            this.notifier.publish(loaded, otherSide(side), { type: LiveEventType.MESSAGE_READ, conversationId });
        }
        return { readAt: isMarked ? now : null };
    }

    /** The staff closes a request (read-only from then) or reopens it; repeating changes nothing. */
    async setClosed(conversationId: string, closed: boolean, actor: Actor): Promise<ConversationDetail> {
        const support = await this.messageRepository.findSupportParticipants(conversationId);
        if (!support) {
            if (await this.messageRepository.findViewingParticipants(conversationId)) {
                throw MessageError.notSupport();
            }
            throw new ResourceNotFoundException();
        }
        const isChanged = await this.messageRepository.setClosed(conversationId, closed ? this.clock.now() : null);
        if (isChanged) {
            this.notifier.supportChanged(support.openedById, conversationId);
            this.logger.info({ conversationId, closed }, 'Support request changed');
        }
        return this.conversationQueryService.find(conversationId, actor);
    }

    /**
     * The write: a confirmed viewing (held ones stay open — "thanks, we would like to apply") that
     * the staff only reads, or a support request not closed; under the thread's cap. The
     * recipient's unread count before the insert decides the email.
     */
    @Transactional()
    private async append(command: SendMessageCommand, actor: Actor): Promise<AppendedMessage> {
        const viewing = await this.messageRepository.findViewingParticipants(command.conversationId);
        if (viewing) {
            return this.appendToViewing(viewing, command.body, actor);
        }
        const support = await this.messageRepository.findSupportParticipants(command.conversationId);
        if (!support) {
            throw new ResourceNotFoundException();
        }
        return this.appendToSupport(support, command.body, actor);
    }

    private async appendToViewing(
        viewing: ViewingParticipantsRecord,
        body: string,
        actor: Actor,
    ): Promise<AppendedMessage> {
        if (actor.role === UserRole.ADMIN) {
            throw MessageError.staffReadOnly();
        }
        if (viewing.status !== ViewingStatus.CONFIRMED) {
            throw viewing.status === ViewingStatus.CANCELLED
                ? MessageError.viewingClosed()
                : MessageError.notConfirmed();
        }
        const side = actor.role === UserRole.TENANT ? MessageSide.REQUESTER : MessageSide.RESPONDER;
        const thread = viewing.conversation;
        assertUnderCap(thread?.messageCount ?? 0);
        const unreadBefore = thread
            ? await this.messageRepository.countSince(viewing.id, side, readMarkerOf(thread, otherSide(side)))
            : 0;
        const record = await this.messageRepository.createInViewing(
            { viewingId: viewing.id, senderId: actor.userId, side, body },
            this.clock.now(),
        );
        this.logger.info({ conversationId: viewing.id, side }, 'Message sent');
        return { record, unreadBefore, side };
    }

    private async appendToSupport(
        support: SupportParticipantsRecord,
        body: string,
        actor: Actor,
    ): Promise<AppendedMessage> {
        if (support.closedAt !== null) {
            throw MessageError.supportClosed();
        }
        const side = support.openedById === actor.userId ? MessageSide.REQUESTER : MessageSide.RESPONDER;
        assertUnderCap(support.messageCount);
        const unreadBefore = await this.messageRepository.countSince(
            support.id,
            side,
            readMarkerOf(support, otherSide(side)),
        );
        const record = await this.messageRepository.createInSupport(
            { conversationId: support.id, senderId: actor.userId, side, body },
            this.clock.now(),
        );
        this.logger.info({ conversationId: support.id, side }, 'Message sent');
        return { record, unreadBefore, side };
    }

    @Transactional()
    private async open(command: StartConversationCommand, openedById: string): Promise<string> {
        if ((await this.messageRepository.countOpenSupportByUser(openedById)) >= MAX_OPEN_SUPPORT) {
            throw MessageError.tooManyOpen();
        }
        if (command.listingId !== null && !(await this.messageRepository.listingExists(command.listingId))) {
            throw new ResourceNotFoundException();
        }
        const id = await this.messageRepository.createSupport(
            { subject: command.subject, listingId: command.listingId, openedById, body: command.body },
            this.clock.now(),
        );
        this.logger.info({ conversationId: id, by: openedById }, 'Support request opened');
        return id;
    }
}
