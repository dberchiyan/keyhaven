import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { AppConfigService } from '@/common/config/app-config.service';
import { EmailSender } from '@/modules/email/service/email-sender';
import { EventService } from '@/modules/event/service/event.service';
import { type LiveEvent, LiveEventType } from '@/modules/event/service/live-event';

import { type LoadedConversation, recipientOf } from './conversation-access';
import type { Conversation, Message } from './message.types';
import { newMessageEmail } from './message-email';
import { ConversationKind, MessageSide } from './message-side';

/**
 * Tells a conversation's sides what happened: their open tabs through the live channel and, for a
 * new message, their inbox by email. DATA-14: called after the change committed.
 */
@Injectable()
export class MessageNotifier {
    constructor(
        private readonly emailSender: EmailSender,
        private readonly events: EventService,
        private readonly config: AppConfigService,
        @InjectPinoLogger(MessageNotifier.name) private readonly logger: PinoLogger,
    ) {}

    /** A live event to one side: the requester's tabs, the owner's (landlord / agency), or the staff's. */
    publish(loaded: LoadedConversation, side: MessageSide, event: LiveEvent): void {
        if (loaded.kind === ConversationKind.SUPPORT) {
            if (side === MessageSide.REQUESTER) {
                this.events.publishToUser(loaded.record.openedBy?.id ?? '', event);
                return;
            }
            this.events.publishToAdmins(event);
            return;
        }
        if (side === MessageSide.REQUESTER) {
            this.events.publishToUser(loaded.record.tenantId, event);
            return;
        }
        this.events.publishToOwner(loaded.record.listing.landlordId, loaded.record.listing.agencyId, event);
    }

    /** A new support request: the staff's tabs share one inbox. */
    supportOpened(conversationId: string): void {
        this.events.publishToAdmins({ type: LiveEventType.MESSAGE_CREATED, conversationId });
    }

    /** The member's tabs learn that the staff closed or reopened their request. */
    supportChanged(openedById: string | null, conversationId: string): void {
        this.events.publishToUser(openedById ?? '', { type: LiveEventType.CONVERSATION_CHANGED, conversationId });
    }

    /**
     * One email per run of unread messages, not one per message: the caller emails only when the
     * recipient had nothing unread before this one. A failed delivery is logged, never thrown — the
     * message is already what the client sees.
     */
    async emailNewMessage(
        loaded: LoadedConversation,
        side: MessageSide,
        conversation: Conversation,
        message: Message,
    ): Promise<void> {
        const recipient = recipientOf(loaded, side);
        if (!recipient) {
            return;
        }
        try {
            await this.emailSender.send(newMessageEmail(recipient, conversation, message, this.config.get('APP_URL')));
        } catch (error: unknown) {
            this.logger.warn({ err: error, conversationId: conversation.id }, 'Message email not delivered');
        }
    }
}
