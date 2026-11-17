import type { Principal } from '@/common/security/principal';
import { UserRole } from '@/modules/user/service/user-role';

import type {
    MessageRecord,
    SupportConversationRecord,
    ViewingConversationRecord,
} from '../repository/record/message.record';
import type { InboxScope, Message } from './message.types';
import type { Recipient } from './message-email';
import { ConversationKind, isMessageSide, MessageSide } from './message-side';

export type LoadedConversation =
    | { kind: typeof ConversationKind.VIEWING; record: ViewingConversationRecord }
    | { kind: typeof ConversationKind.SUPPORT; record: SupportConversationRecord };

export const toMessage = (record: MessageRecord): Message => ({
    id: record.id,
    conversationId: record.conversationId,
    side: isMessageSide(record.side) ? record.side : MessageSide.REQUESTER,
    sender: record.sender,
    body: record.body,
    isRemoved: record.isRemoved,
    createdAt: record.createdAt,
});

/** A viewing's thread row exists only from the first message; a support request is its own thread. */
export const readAtOf = (loaded: LoadedConversation, side: MessageSide): Date | null => {
    const thread = loaded.kind === ConversationKind.VIEWING ? loaded.record.conversation : loaded.record;
    if (!thread) {
        return null;
    }
    return side === MessageSide.REQUESTER ? thread.requesterReadAt : thread.responderReadAt;
};

const viewingRecipientOf = (record: ViewingConversationRecord, side: MessageSide): Recipient | undefined => {
    if (side === MessageSide.REQUESTER) {
        return { email: record.tenant.email, firstName: record.tenant.firstName };
    }
    if (record.listing.landlord) {
        return { email: record.listing.landlord.email, firstName: record.listing.landlord.firstName };
    }
    return record.listing.agency
        ? { email: record.listing.agency.email, firstName: record.listing.agency.name }
        : undefined;
};

/** Who gets the email about a message from the other side; the staff has no inbox to email. */
export const recipientOf = (loaded: LoadedConversation, side: MessageSide): Recipient | undefined => {
    if (loaded.kind === ConversationKind.VIEWING) {
        return viewingRecipientOf(loaded.record, side);
    }
    const opener = loaded.record.openedBy;
    return side === MessageSide.REQUESTER && opener ? { email: opener.email, firstName: opener.firstName } : undefined;
};

/**
 * The caller's side in one conversation: a viewing's tenant and a request's opener ask, the
 * home's owner and the staff answer (an admin reading a viewing's thread stands on the owner's
 * side, read only).
 */
export const sideOf = (principal: Principal, loaded: LoadedConversation): MessageSide => {
    const isRequester =
        loaded.kind === ConversationKind.VIEWING
            ? principal.hasAuthority(UserRole.TENANT)
            : loaded.record.openedBy?.id === principal.userId;
    return isRequester ? MessageSide.REQUESTER : MessageSide.RESPONDER;
};

/** SEC-6: the caller's scopes go into the inbox query, with the side they take in each kind. */
export const inboxScopeOf = (principal: Principal): InboxScope => {
    if (principal.hasAuthority(UserRole.ADMIN)) {
        return {
            viewing: { kind: 'ALL' },
            viewingSide: MessageSide.RESPONDER,
            support: { kind: 'ALL' },
            supportSide: MessageSide.RESPONDER,
        };
    }
    const support = { kind: 'OWN', userId: principal.userId } as const;
    if (principal.hasAuthority(UserRole.AGENT) && principal.agencyId) {
        const viewing = { kind: 'AGENCY', agencyId: principal.agencyId } as const;
        return { viewing, viewingSide: MessageSide.RESPONDER, support, supportSide: MessageSide.REQUESTER };
    }
    if (principal.hasAuthority(UserRole.LANDLORD)) {
        const viewing = { kind: 'LANDLORD', landlordId: principal.userId } as const;
        return { viewing, viewingSide: MessageSide.RESPONDER, support, supportSide: MessageSide.REQUESTER };
    }
    const viewing = { kind: 'TENANT', tenantId: principal.userId } as const;
    return { viewing, viewingSide: MessageSide.REQUESTER, support, supportSide: MessageSide.REQUESTER };
};
