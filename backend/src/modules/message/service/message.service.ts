import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { BusinessRuleException, ResourceNotFoundException } from '@/common/exception/api.exception';
import type { Principal } from '@/common/security/principal';
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
        throw new BusinessRuleException('errors.message.threadFull', { max: MAX_THREAD_MESSAGES });
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
        @InjectPinoLogger(MessageService.name) private readonly logger: PinoLogger,
    ) {}

    /** A message from either side; DATA-14: the other side is told after commit and, when idle there, by email. */
    async send(principal: Principal, command: SendMessageCommand): Promise<Message> {
        const { record, unreadBefore, side } = await this.append(principal, command);
        const message = toMessage(record);
        const loaded = await this.conversationQueryService.load(command.conversationId);
        this.notifier.publish(loaded, otherSide(side), {
            type: LiveEventType.MESSAGE_CREATED,
            conversationId: command.conversationId,
        });
        if (unreadBefore === 0) {
            const conversation = this.conversationQueryService.toConversation(loaded, principal, 0);
            await this.notifier.emailNewMessage(loaded, otherSide(side), conversation, message);
        }
        return message;
    }

    /** A member writes to Keyhaven: a new request with its first message; the staff's tabs are told. */
    async start(principal: Principal, command: StartConversationCommand): Promise<ConversationDetail> {
        const id = await this.open(principal.userId, command);
        this.notifier.supportOpened(id);
        return this.conversationQueryService.find(principal, id);
    }

    /** The caller read the thread: safe to repeat; nothing to mark before the first message. */
    async markRead(principal: Principal, conversationId: string): Promise<ReadReceipt> {
        const now = new Date();
        const loaded = await this.conversationQueryService.load(conversationId);
        const side = sideOf(principal, loaded);
        const isMarked = await this.messageRepository.markRead(conversationId, side, now);
        if (isMarked) {
            this.notifier.publish(loaded, otherSide(side), { type: LiveEventType.MESSAGE_READ, conversationId });
        }
        return { readAt: isMarked ? now : null };
    }

    /** The staff closes a request (read-only from then) or reopens it; repeating changes nothing. */
    async setClosed(principal: Principal, conversationId: string, closed: boolean): Promise<ConversationDetail> {
        const support = await this.messageRepository.findSupportParticipants(conversationId);
        if (!support) {
            if (await this.messageRepository.findViewingParticipants(conversationId)) {
                throw new BusinessRuleException('errors.message.notSupport');
            }
            throw new ResourceNotFoundException();
        }
        const isChanged = await this.messageRepository.setClosed(conversationId, closed ? new Date() : null);
        if (isChanged) {
            this.notifier.supportChanged(support.openedById, conversationId);
            this.logger.info({ conversationId, closed }, 'Support request changed');
        }
        return this.conversationQueryService.find(principal, conversationId);
    }

    /**
     * The write: a confirmed viewing (held ones stay open — "thanks, we would like to apply") that
     * the staff only reads, or a support request not closed; under the thread's cap. The
     * recipient's unread count before the insert decides the email.
     */
    @Transactional()
    private async append(principal: Principal, command: SendMessageCommand): Promise<AppendedMessage> {
        const viewing = await this.messageRepository.findViewingParticipants(command.conversationId);
        if (viewing) {
            return this.appendToViewing(principal, viewing, command.body);
        }
        const support = await this.messageRepository.findSupportParticipants(command.conversationId);
        if (!support) {
            throw new ResourceNotFoundException();
        }
        return this.appendToSupport(principal, support, command.body);
    }

    private async appendToViewing(
        principal: Principal,
        viewing: ViewingParticipantsRecord,
        body: string,
    ): Promise<AppendedMessage> {
        if (principal.hasAuthority(UserRole.ADMIN)) {
            throw new BusinessRuleException('errors.message.staffReadOnly');
        }
        if (viewing.status !== ViewingStatus.CONFIRMED) {
            throw new BusinessRuleException(
                viewing.status === ViewingStatus.CANCELLED ? 'errors.message.closed' : 'errors.message.notConfirmed',
            );
        }
        const side = principal.hasAuthority(UserRole.TENANT) ? MessageSide.REQUESTER : MessageSide.RESPONDER;
        const thread = viewing.conversation;
        assertUnderCap(thread?.messageCount ?? 0);
        const unreadBefore = thread
            ? await this.messageRepository.countSince(viewing.id, side, readMarkerOf(thread, otherSide(side)))
            : 0;
        const record = await this.messageRepository.createInViewing(
            { viewingId: viewing.id, senderId: principal.userId, side, body },
            new Date(),
        );
        this.logger.info({ conversationId: viewing.id, side }, 'Message sent');
        return { record, unreadBefore, side };
    }

    private async appendToSupport(
        principal: Principal,
        support: SupportParticipantsRecord,
        body: string,
    ): Promise<AppendedMessage> {
        if (support.closedAt !== null) {
            throw new BusinessRuleException('errors.message.supportClosed');
        }
        const side = support.openedById === principal.userId ? MessageSide.REQUESTER : MessageSide.RESPONDER;
        assertUnderCap(support.messageCount);
        const unreadBefore = await this.messageRepository.countSince(
            support.id,
            side,
            readMarkerOf(support, otherSide(side)),
        );
        const record = await this.messageRepository.createInSupport(
            { conversationId: support.id, senderId: principal.userId, side, body },
            new Date(),
        );
        this.logger.info({ conversationId: support.id, side }, 'Message sent');
        return { record, unreadBefore, side };
    }

    @Transactional()
    private async open(openedById: string, command: StartConversationCommand): Promise<string> {
        if ((await this.messageRepository.countOpenSupportByUser(openedById)) >= MAX_OPEN_SUPPORT) {
            throw new BusinessRuleException('errors.message.tooManyOpen', { max: MAX_OPEN_SUPPORT });
        }
        if (command.listingId !== null && !(await this.messageRepository.listingExists(command.listingId))) {
            throw new ResourceNotFoundException();
        }
        const id = await this.messageRepository.createSupport(
            { subject: command.subject, listingId: command.listingId, openedById, body: command.body },
            new Date(),
        );
        this.logger.info({ conversationId: id, by: openedById }, 'Support request opened');
        return id;
    }
}
