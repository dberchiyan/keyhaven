import type { ViewingStatus } from '@/modules/viewing/service/viewing-status';

import type { ConversationKind, CounterpartKind, MessageSide } from './message-side';

export interface ConversationListing {
    id: string;
    title: string;
    coverPhotoUrl: string | null;
    neighborhood: string | null;
    city: { name: string; state: string; timeZone: string };
    address: { line1: string; line2: string | null } | null;
}

export interface Counterpart {
    name: string;
    kind: CounterpartKind;
}

export interface MessagePreview {
    body: string;
    isRemoved: boolean;
    side: MessageSide;
    createdAt: Date;
}

export interface Conversation {
    id: string;
    kind: ConversationKind;
    isOpen: boolean;
    side: MessageSide;
    viewing: { id: string; status: ViewingStatus; startsAt: Date; endsAt: Date } | null;
    support: { subject: string; openedAt: Date; closedAt: Date | null } | null;
    listing: ConversationListing | null;
    counterpart: Counterpart;
    lastMessage: MessagePreview | null;
    messageCount: number;
    unread: number;
    readAt: Date | null;
    seenAt: Date | null;
}

export interface Message {
    id: string;
    conversationId: string;
    side: MessageSide;
    sender: { id: string; firstName: string; lastName: string };
    body: string;
    isRemoved: boolean;
    createdAt: Date;
}

export interface ConversationDetail extends Conversation {
    messages: Message[];
}

export interface ConversationSummary {
    unread: number;
}

export interface ReadReceipt {
    readAt: Date | null;
}

export interface SendMessageCommand {
    conversationId: string;
    body: string;
}

export interface StartConversationCommand {
    subject: string;
    body: string;
    listingId: string | null;
}

export type ViewingScope =
    | { kind: 'TENANT'; tenantId: string }
    | { kind: 'LANDLORD'; landlordId: string }
    | { kind: 'AGENCY'; agencyId: string }
    | { kind: 'ALL' };

export type SupportScope = { kind: 'OWN'; userId: string } | { kind: 'ALL' };

export interface InboxScope {
    viewing: ViewingScope;
    viewingSide: MessageSide;
    support: SupportScope;
    supportSide: MessageSide;
}

export interface WrittenMessageExport {
    conversationId: string;
    body: string;
    createdAt: Date;
}

export interface OpenedConversationExport {
    subject: string;
    createdAt: Date;
}

export interface MessageDataExport {
    messagesWritten: WrittenMessageExport[];
    conversationsOpened: OpenedConversationExport[];
}
