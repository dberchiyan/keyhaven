import type { ViewingStatus } from '../../viewing/service/viewing-status';
import type { ConversationKind, CounterpartKind, MessageSide } from './message-side';

export interface ConversationListing {
  id: string;
  title: string;
  coverPhotoUrl: string | null;
  neighborhood: string | null;
  city: { name: string; state: string; timeZone: string };
  /** The exact address: the owner's side always, the tenant's while the viewing is confirmed; never on a support request. */
  address: { line1: string; line2: string | null } | null;
}

/** The person, agency or staff on the other end. */
export interface Counterpart {
  name: string;
  kind: CounterpartKind;
}

export interface MessagePreview {
  body: string;
  side: MessageSide;
  createdAt: Date;
}

/** One conversation as the caller's side sees it: a viewing's thread, or a request to Keyhaven. */
export interface Conversation {
  id: string;
  kind: ConversationKind;
  /** Both sides can write: a confirmed viewing (ahead or held), or a support request not closed. */
  open: boolean;
  /** The caller's side — the client tells its own messages apart by it. */
  side: MessageSide;
  viewing: { id: string; status: ViewingStatus; startsAt: Date; endsAt: Date } | null;
  support: { subject: string; openedAt: Date; closedAt: Date | null } | null;
  /** The viewing's home, or the home a support request is about (if any). */
  listing: ConversationListing | null;
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
  conversationId: string;
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
  conversationId: string;
  body: string;
}

export interface StartConversationCommand {
  subject: string;
  body: string;
  listingId: string | null;
}

/** Whose viewings' conversations the inbox lists — in the query, never a filter afterwards. */
export type ViewingScope =
  | { kind: 'TENANT'; tenantId: string }
  | { kind: 'LANDLORD'; landlordId: string }
  | { kind: 'AGENCY'; agencyId: string }
  | { kind: 'ALL' };

/** Whose support requests: one's own, or (the staff) all of them. */
export type SupportScope = { kind: 'OWN'; userId: string } | { kind: 'ALL' };

/** What the inbox needs of the caller: both scopes, and the side they take in each kind. */
export interface InboxScope {
  viewing: ViewingScope;
  viewingSide: MessageSide;
  support: SupportScope;
  supportSide: MessageSide;
}
