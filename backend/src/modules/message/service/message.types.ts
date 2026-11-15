import type { ViewingStatus } from '../../viewing/service/viewing-status';
import type { CounterpartKind, MessageSide } from './message-side';

export interface ConversationListing {
  id: string;
  title: string;
  coverPhotoUrl: string | null;
  neighborhood: string | null;
  city: { name: string; state: string; timeZone: string };
  /** The exact address: the owner's side always, the tenant's while the viewing is confirmed. */
  address: { line1: string; line2: string | null } | null;
}

/** The person or agency on the other end. */
export interface Counterpart {
  name: string;
  kind: CounterpartKind;
}

export interface MessagePreview {
  body: string;
  side: MessageSide;
  createdAt: Date;
}

/** One viewing's conversation as the caller's side sees it. */
export interface Conversation {
  viewingId: string;
  status: ViewingStatus;
  startsAt: Date;
  endsAt: Date;
  /** Confirmed (ahead or held): both sides can write. Cancelled: read only. */
  open: boolean;
  /** The caller's side — the client tells its own messages apart by it. */
  side: MessageSide;
  listing: ConversationListing;
  counterpart: Counterpart;
  lastMessage: MessagePreview | null;
  messageCount: number;
  /** Messages from the other side the caller has not read. */
  unread: number;
  readAt: Date | null;
  /** When the other side last read the thread: the caller's messages before it were seen. */
  seenAt: Date | null;
}

export interface Message {
  id: string;
  viewingId: string;
  side: MessageSide;
  sender: { id: string; firstName: string; lastName: string };
  body: string;
  createdAt: Date;
}

export interface ConversationDetail extends Conversation {
  /** Oldest first, the whole thread (bounded by MAX_THREAD_MESSAGES). */
  messages: Message[];
}

export interface ConversationSummary {
  unread: number;
}

export interface ReadReceipt {
  readAt: Date | null;
}

export interface SendMessageCommand {
  viewingId: string;
  body: string;
}

/** Whose conversations the inbox lists — the caller's scope, in the query, never a filter afterwards. */
export type ConversationScope =
  | { kind: 'TENANT'; tenantId: string }
  | { kind: 'LANDLORD'; landlordId: string }
  | { kind: 'AGENCY'; agencyId: string }
  | { kind: 'ALL' };
