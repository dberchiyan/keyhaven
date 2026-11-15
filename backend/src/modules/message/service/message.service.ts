import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../../../common/config/app-config.service';
import {
  BusinessRuleException,
  ResourceNotFoundException,
} from '../../../common/exception/api.exception';
import type { Principal } from '../../../common/security/principal';
import type { EmailMessage } from '../../email/service/email-sender';
import { EmailSender } from '../../email/service/email-sender';
import { EventService } from '../../event/service/event.service';
import { type LiveEvent, LiveEventType } from '../../event/service/live-event';
import { ObjectStorage } from '../../storage/service/object-storage';
import { UserRole } from '../../user/service/user-role';
import { isViewingStatus, ViewingStatus } from '../../viewing/service/viewing-status';
import { MessageRepository } from '../repository/message.repository';
import type {
  MessageRecord,
  SupportConversationRecord,
  ViewingConversationRecord,
} from '../repository/record/message.record';
import { newMessageEmail, type Recipient } from './message-email';
import { MAX_OPEN_SUPPORT, MAX_THREAD_MESSAGES } from './message-limits';
import {
  ConversationKind,
  CounterpartKind,
  isMessageSide,
  MessageSide,
  otherSide,
} from './message-side';
import type {
  Conversation,
  ConversationDetail,
  ConversationListing,
  ConversationSummary,
  InboxScope,
  Message,
  ReadReceipt,
  SendMessageCommand,
  StartConversationCommand,
} from './message.types';

/** A conversation record of either kind, with the side the caller takes in it. */
type AnyRecord =
  | { kind: typeof ConversationKind.VIEWING; record: ViewingConversationRecord }
  | { kind: typeof ConversationKind.SUPPORT; record: SupportConversationRecord };

/** Only an admin's `role` is staff; everyone else writes to Keyhaven as a member. */
const SUPPORT_KINDS: Readonly<Record<string, CounterpartKind>> = {
  TENANT: CounterpartKind.TENANT,
  LANDLORD: CounterpartKind.LANDLORD,
  AGENT: CounterpartKind.AGENT,
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
    private readonly emailSender: EmailSender,
    private readonly events: EventService,
    private readonly storage: ObjectStorage,
    private readonly config: AppConfigService,
    @InjectPinoLogger(MessageService.name) private readonly logger: PinoLogger,
  ) {}

  /** The caller's inbox, latest message first. */
  async list(principal: Principal): Promise<Conversation[]> {
    const scope = scopeOf(principal);
    const ranked = await this.messageRepository.findInbox(scope);
    const [viewings, supports] = await Promise.all([
      this.messageRepository.findViewingConversations(
        ranked.filter((row) => row.kind === ConversationKind.VIEWING).map((row) => row.id),
      ),
      this.messageRepository.findSupportConversations(
        ranked.filter((row) => row.kind === ConversationKind.SUPPORT).map((row) => row.id),
      ),
    ]);
    const viewingById = new Map(viewings.map((record) => [record.id, record]));
    const supportById = new Map(supports.map((record) => [record.id, record]));
    return ranked.flatMap((row) => {
      const viewing = viewingById.get(row.id);
      const support = supportById.get(row.id);
      const any: AnyRecord | null =
        row.kind === ConversationKind.VIEWING && viewing
          ? { kind: ConversationKind.VIEWING, record: viewing }
          : row.kind === ConversationKind.SUPPORT && support
            ? { kind: ConversationKind.SUPPORT, record: support }
            : null;
      return any ? [this.toConversation(any, principal, row.unread)] : [];
    });
  }

  /** One conversation with its whole thread (the policy checked the caller may read it). */
  async find(principal: Principal, conversationId: string): Promise<ConversationDetail> {
    const any = await this.load(conversationId);
    const side = sideOf(principal, any);
    const [messages, unread] = await Promise.all([
      this.messageRepository.findMessages(conversationId),
      this.messageRepository.countSince(conversationId, otherSide(side), readAtOf(any, side)),
    ]);
    return { ...this.toConversation(any, principal, unread), messages: messages.map(toMessage) };
  }

  summary(principal: Principal): Promise<ConversationSummary> {
    return this.messageRepository
      .countUnreadInScope(scopeOf(principal))
      .then((unread) => ({ unread }));
  }

  /** A message from either side; the other side is told at once and, when idle there, by email. */
  async send(principal: Principal, command: SendMessageCommand): Promise<Message> {
    const { record, unreadBefore, side } = await this.append(principal, command);
    const message = toMessage(record);
    // After commit (data.md → Transactions).
    const any = await this.load(command.conversationId);
    this.publish(any, otherSide(side), {
      type: LiveEventType.MESSAGE_CREATED,
      conversationId: command.conversationId,
    });
    if (unreadBefore === 0) {
      const recipient = recipientOf(any, otherSide(side));
      await this.deliver(
        recipient &&
          newMessageEmail(
            recipient,
            this.toConversation(any, principal, 0),
            message,
            this.config.get('APP_URL'),
          ),
        command.conversationId,
      );
    }
    return message;
  }

  /**
   * The write: a confirmed viewing (held ones stay open — "thanks, we would like to apply") that
   * the staff only reads, or a support request not closed; under the thread's cap. The
   * recipient's unread count before the insert decides the email.
   */
  @Transactional()
  private async append(
    principal: Principal,
    command: SendMessageCommand,
  ): Promise<{ record: MessageRecord; unreadBefore: number; side: MessageSide }> {
    const viewing = await this.messageRepository.findViewingParticipants(command.conversationId);
    if (viewing) {
      if (principal.hasAuthority(UserRole.ADMIN)) {
        throw new BusinessRuleException('errors.message.staffReadOnly');
      }
      if (viewing.status !== ViewingStatus.CONFIRMED) {
        throw new BusinessRuleException(
          viewing.status === ViewingStatus.CANCELLED
            ? 'errors.message.closed'
            : 'errors.message.notConfirmed',
        );
      }
      const side = principal.hasAuthority(UserRole.TENANT)
        ? MessageSide.REQUESTER
        : MessageSide.RESPONDER;
      const thread = viewing.conversation;
      this.underCap(thread?.messageCount ?? 0);
      const unreadBefore = thread
        ? await this.messageRepository.countSince(
            command.conversationId,
            side,
            otherSide(side) === MessageSide.REQUESTER
              ? thread.requesterReadAt
              : thread.responderReadAt,
          )
        : 0;
      const record = await this.messageRepository.createInViewing(
        { viewingId: viewing.id, senderId: principal.userId, side, body: command.body },
        new Date(),
      );
      this.logger.info({ conversationId: viewing.id, side }, 'Message sent');
      return { record, unreadBefore, side };
    }
    const support = await this.messageRepository.findSupportParticipants(command.conversationId);
    if (!support) {
      throw new ResourceNotFoundException();
    }
    if (support.closedAt !== null) {
      throw new BusinessRuleException('errors.message.supportClosed');
    }
    const side =
      support.openedById === principal.userId ? MessageSide.REQUESTER : MessageSide.RESPONDER;
    this.underCap(support.messageCount);
    const unreadBefore = await this.messageRepository.countSince(
      support.id,
      side,
      otherSide(side) === MessageSide.REQUESTER ? support.requesterReadAt : support.responderReadAt,
    );
    const record = await this.messageRepository.createInSupport(
      { conversationId: support.id, senderId: principal.userId, side, body: command.body },
      new Date(),
    );
    this.logger.info({ conversationId: support.id, side }, 'Message sent');
    return { record, unreadBefore, side };
  }

  /** A member writes to Keyhaven: a new request with its first message; the staff's tabs are told. */
  async start(
    principal: Principal,
    command: StartConversationCommand,
  ): Promise<ConversationDetail> {
    const id = await this.open(principal, command);
    this.events.publishToAdmins({ type: LiveEventType.MESSAGE_CREATED, conversationId: id });
    return this.find(principal, id);
  }

  @Transactional()
  private async open(principal: Principal, command: StartConversationCommand): Promise<string> {
    if (
      (await this.messageRepository.countOpenSupportByUser(principal.userId)) >= MAX_OPEN_SUPPORT
    ) {
      throw new BusinessRuleException('errors.message.tooManyOpen', { max: MAX_OPEN_SUPPORT });
    }
    if (
      command.listingId !== null &&
      !(await this.messageRepository.listingExists(command.listingId))
    ) {
      throw new ResourceNotFoundException();
    }
    const id = await this.messageRepository.createSupport(
      {
        subject: command.subject,
        listingId: command.listingId,
        openedById: principal.userId,
        body: command.body,
      },
      new Date(),
    );
    this.logger.info({ conversationId: id, by: principal.userId }, 'Support request opened');
    return id;
  }

  /** The caller read the thread: safe to repeat; nothing to mark before the first message. */
  async markRead(principal: Principal, conversationId: string): Promise<ReadReceipt> {
    const now = new Date();
    const any = await this.load(conversationId);
    const side = sideOf(principal, any);
    const marked = await this.messageRepository.markRead(conversationId, side, now);
    if (marked) {
      // The other side sees "Seen" under what they wrote.
      this.publish(any, otherSide(side), { type: LiveEventType.MESSAGE_READ, conversationId });
    }
    return { readAt: marked ? now : null };
  }

  /** The staff closes a request (read-only from then) or reopens it; repeating changes nothing. */
  async setClosed(
    principal: Principal,
    conversationId: string,
    closed: boolean,
  ): Promise<ConversationDetail> {
    const support = await this.messageRepository.findSupportParticipants(conversationId);
    if (!support) {
      if (await this.messageRepository.findViewingParticipants(conversationId)) {
        throw new BusinessRuleException('errors.message.notSupport');
      }
      throw new ResourceNotFoundException();
    }
    const changed = await this.messageRepository.setClosed(
      conversationId,
      closed ? new Date() : null,
    );
    if (changed) {
      this.events.publishToUser(support.openedById ?? '', {
        type: LiveEventType.CONVERSATION_CHANGED,
        conversationId,
      });
      this.logger.info({ conversationId, closed }, 'Support request changed');
    }
    return this.find(principal, conversationId);
  }

  private underCap(count: number): void {
    if (count >= MAX_THREAD_MESSAGES) {
      throw new BusinessRuleException('errors.message.threadFull', { max: MAX_THREAD_MESSAGES });
    }
  }

  private async load(conversationId: string): Promise<AnyRecord> {
    const viewing = await this.messageRepository.findViewingConversation(conversationId);
    if (viewing) {
      return { kind: ConversationKind.VIEWING, record: viewing };
    }
    const support = await this.messageRepository.findSupportConversation(conversationId);
    if (support) {
      return { kind: ConversationKind.SUPPORT, record: support };
    }
    throw new ResourceNotFoundException();
  }

  /** A live event to one side: the requester's tabs, the owner's (landlord / agency), or the staff's. */
  private publish(any: AnyRecord, side: MessageSide, event: LiveEvent): void {
    if (any.kind === ConversationKind.VIEWING) {
      if (side === MessageSide.REQUESTER) {
        this.events.publishToUser(any.record.tenantId, event);
      } else {
        this.events.publishToOwner(
          any.record.listing.landlordId,
          any.record.listing.agencyId,
          event,
        );
      }
    } else if (side === MessageSide.REQUESTER) {
      this.events.publishToUser(any.record.openedBy?.id ?? '', event);
    } else {
      this.events.publishToAdmins(event);
    }
  }

  /** A failed delivery is logged, never thrown: the message is already what the client sees. */
  private async deliver(message: EmailMessage | null, conversationId: string): Promise<void> {
    if (!message) {
      return;
    }
    try {
      await this.emailSender.send(message);
    } catch (error: unknown) {
      this.logger.warn({ err: error, conversationId }, 'Message email not delivered');
    }
  }

  private toConversation(any: AnyRecord, principal: Principal, unread: number): Conversation {
    const side = sideOf(principal, any);
    const thread = any.kind === ConversationKind.VIEWING ? any.record.conversation : any.record;
    const last = thread?.messages[0];
    const base = {
      side,
      lastMessage:
        last && isMessageSide(last.side)
          ? { body: last.body, side: last.side, createdAt: last.createdAt }
          : null,
      messageCount: thread?.messageCount ?? 0,
      unread,
      readAt: readAtOf(any, side),
      seenAt: readAtOf(any, otherSide(side)),
    };
    if (any.kind === ConversationKind.VIEWING) {
      const { record } = any;
      const status = isViewingStatus(record.status) ? record.status : ViewingStatus.EXPIRED;
      return {
        ...base,
        id: record.id,
        kind: ConversationKind.VIEWING,
        open: status === ViewingStatus.CONFIRMED,
        viewing: { id: record.id, status, startsAt: record.startsAt, endsAt: record.endsAt },
        support: null,
        // The tenant's side learns the address with the confirmation; the owner's always has it.
        listing: this.toListing(
          record.listing,
          side === MessageSide.RESPONDER || status === ViewingStatus.CONFIRMED,
        ),
        counterpart:
          side === MessageSide.REQUESTER
            ? record.listing.landlord
              ? {
                  name: `${record.listing.landlord.firstName} ${record.listing.landlord.lastName}`,
                  kind: CounterpartKind.LANDLORD,
                }
              : { name: record.listing.agency?.name ?? '', kind: CounterpartKind.AGENCY }
            : {
                name: `${record.tenant.firstName} ${record.tenant.lastName}`,
                kind: CounterpartKind.TENANT,
              },
      };
    }
    const { record } = any;
    return {
      ...base,
      id: record.id,
      kind: ConversationKind.SUPPORT,
      open: record.closedAt === null,
      viewing: null,
      support: {
        subject: record.subject ?? '',
        openedAt: record.createdAt,
        closedAt: record.closedAt,
      },
      listing: record.listing ? this.toListing(record.listing, false) : null,
      counterpart:
        side === MessageSide.REQUESTER
          ? { name: 'Keyhaven', kind: CounterpartKind.KEYHAVEN }
          : {
              name: record.openedBy
                ? `${record.openedBy.firstName} ${record.openedBy.lastName}`
                : '',
              kind: SUPPORT_KINDS[record.openedBy?.role ?? ''] ?? CounterpartKind.TENANT,
            },
    };
  }

  private toListing(
    listing: ViewingConversationRecord['listing'],
    withAddress: boolean,
  ): ConversationListing {
    const cover = listing.photos[0];
    return {
      id: listing.id,
      title: listing.title,
      coverPhotoUrl: cover
        ? (cover.url ?? (cover.storageKey ? this.storage.publicUrl(cover.storageKey) : null))
        : null,
      neighborhood: listing.neighborhood,
      city: listing.city,
      address: withAddress ? { line1: listing.addressLine1, line2: listing.addressLine2 } : null,
    };
  }
}

const toMessage = (record: MessageRecord): Message => ({
  id: record.id,
  conversationId: record.conversationId,
  side: isMessageSide(record.side) ? record.side : MessageSide.REQUESTER,
  sender: record.sender,
  body: record.body,
  createdAt: record.createdAt,
});

const readAtOf = (any: AnyRecord, side: MessageSide): Date | null => {
  const thread = any.kind === ConversationKind.VIEWING ? any.record.conversation : any.record;
  return thread
    ? side === MessageSide.REQUESTER
      ? thread.requesterReadAt
      : thread.responderReadAt
    : null;
};

/** Who gets the email about a message from the other side; the staff has no inbox to email. */
const recipientOf = (any: AnyRecord, side: MessageSide): Recipient | null => {
  if (any.kind === ConversationKind.VIEWING) {
    const { record } = any;
    return side === MessageSide.REQUESTER
      ? { email: record.tenant.email, firstName: record.tenant.firstName }
      : record.listing.landlord
        ? { email: record.listing.landlord.email, firstName: record.listing.landlord.firstName }
        : record.listing.agency
          ? { email: record.listing.agency.email, firstName: record.listing.agency.name }
          : null;
  }
  return side === MessageSide.REQUESTER && any.record.openedBy
    ? { email: any.record.openedBy.email, firstName: any.record.openedBy.firstName }
    : null;
};

/**
 * The caller's side in one conversation: a viewing's tenant and a request's opener ask, the
 * home's owner and the staff answer (an admin reading a viewing's thread stands on the owner's
 * side, read only).
 */
const sideOf = (principal: Principal, any: AnyRecord): MessageSide =>
  any.kind === ConversationKind.VIEWING
    ? principal.hasAuthority(UserRole.TENANT)
      ? MessageSide.REQUESTER
      : MessageSide.RESPONDER
    : any.record.openedBy?.id === principal.userId
      ? MessageSide.REQUESTER
      : MessageSide.RESPONDER;

const scopeOf = (principal: Principal): InboxScope => {
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
    return {
      viewing: { kind: 'AGENCY', agencyId: principal.agencyId },
      viewingSide: MessageSide.RESPONDER,
      support,
      supportSide: MessageSide.REQUESTER,
    };
  }
  if (principal.hasAuthority(UserRole.LANDLORD)) {
    return {
      viewing: { kind: 'LANDLORD', landlordId: principal.userId },
      viewingSide: MessageSide.RESPONDER,
      support,
      supportSide: MessageSide.REQUESTER,
    };
  }
  return {
    viewing: { kind: 'TENANT', tenantId: principal.userId },
    viewingSide: MessageSide.REQUESTER,
    support,
    supportSide: MessageSide.REQUESTER,
  };
};
