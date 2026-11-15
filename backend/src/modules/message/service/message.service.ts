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
import { ObjectStorage } from '../../storage/service/object-storage';
import { UserRole } from '../../user/service/user-role';
import { isViewingStatus, ViewingStatus } from '../../viewing/service/viewing-status';
import { MessageRepository } from '../repository/message.repository';
import type { ConversationRecord, MessageRecord } from '../repository/record/message.record';
import { newMessageEmail, type Recipient } from './message-email';
import { MAX_THREAD_MESSAGES } from './message-limits';
import { CounterpartKind, isMessageSide, MessageSide, otherSide } from './message-side';
import type {
  Conversation,
  ConversationDetail,
  ConversationScope,
  ConversationSummary,
  Message,
  ReadReceipt,
  SendMessageCommand,
} from './message.types';

/**
 * Messages between a tenant and the home's owner, one conversation per viewing. It opens when the
 * owner confirms the viewing (the user's rule: nobody can write to a stranger, so there is nothing
 * to spam) and closes, read only, when the viewing is cancelled. Nothing is edited or deleted;
 * the other side is emailed about a new message only when they had nothing unread there.
 */
@Injectable()
export class MessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly emailSender: EmailSender,
    private readonly storage: ObjectStorage,
    private readonly config: AppConfigService,
    @InjectPinoLogger(MessageService.name) private readonly logger: PinoLogger,
  ) {}

  /** The caller's inbox, latest message first. */
  async list(principal: Principal): Promise<Conversation[]> {
    const side = sideOf(principal);
    const ranked = await this.messageRepository.findInbox(scopeOf(principal), side);
    const unreadById = new Map(ranked.map((row) => [row.id, row.unread]));
    const records = await this.messageRepository.findConversationsByIds(
      ranked.map((row) => row.id),
    );
    return records.map((record) =>
      this.toConversation(record, side, unreadById.get(record.id) ?? 0),
    );
  }

  /** One conversation with its whole thread (the policy checked the caller may read the viewing). */
  async find(principal: Principal, viewingId: string): Promise<ConversationDetail> {
    const side = sideOf(principal);
    const record = await this.messageRepository.findConversation(viewingId);
    if (!record) {
      throw new ResourceNotFoundException();
    }
    const [messages, unread] = await Promise.all([
      this.messageRepository.findMessages(viewingId),
      this.messageRepository.countSince(viewingId, otherSide(side), readAtOf(record, side)),
    ]);
    return { ...this.toConversation(record, side, unread), messages: messages.map(toMessage) };
  }

  summary(principal: Principal): Promise<ConversationSummary> {
    return this.messageRepository
      .countUnreadInScope(scopeOf(principal), sideOf(principal))
      .then((unread) => ({ unread }));
  }

  /** A message from the tenant or the owner; the other side is told by email after commit. */
  async send(principal: Principal, command: SendMessageCommand): Promise<Message> {
    const side = sideOf(principal);
    const { record, unreadBefore } = await this.append(principal.userId, side, command);
    const message = toMessage(record);
    if (unreadBefore === 0) {
      // After commit (data.md → Transactions): the first unread message of a run is announced.
      const conversation = await this.messageRepository.findConversation(command.viewingId);
      if (conversation) {
        const recipient = recipientOf(conversation, otherSide(side));
        await this.deliver(
          recipient &&
            newMessageEmail(
              recipient,
              this.toConversation(conversation, otherSide(side), 0),
              message,
              this.config.get('APP_URL'),
            ),
          command.viewingId,
        );
      }
    }
    return message;
  }

  /**
   * The write: a confirmed viewing (held ones stay open — "thanks, I would like to apply"),
   * under the thread's cap. The recipient's unread count before the insert decides the email.
   */
  @Transactional()
  private async append(
    senderId: string,
    side: MessageSide,
    command: SendMessageCommand,
  ): Promise<{ record: MessageRecord; unreadBefore: number }> {
    const viewing = await this.messageRepository.findParticipants(command.viewingId);
    if (!viewing) {
      throw new ResourceNotFoundException();
    }
    if (viewing.status !== ViewingStatus.CONFIRMED) {
      throw new BusinessRuleException(
        viewing.status === ViewingStatus.CANCELLED
          ? 'errors.message.closed'
          : 'errors.message.notConfirmed',
      );
    }
    if ((viewing.thread?.messageCount ?? 0) >= MAX_THREAD_MESSAGES) {
      throw new BusinessRuleException('errors.message.threadFull', { max: MAX_THREAD_MESSAGES });
    }
    const recipientReadAt = viewing.thread
      ? otherSide(side) === MessageSide.TENANT
        ? viewing.thread.tenantReadAt
        : viewing.thread.ownerReadAt
      : null;
    const unreadBefore = viewing.thread
      ? await this.messageRepository.countSince(command.viewingId, side, recipientReadAt)
      : 0;
    const record = await this.messageRepository.create(
      { viewingId: command.viewingId, senderId, side, body: command.body },
      new Date(),
    );
    this.logger.info({ viewingId: command.viewingId, side }, 'Message sent');
    return { record, unreadBefore };
  }

  /** The caller read the thread: safe to repeat; nothing to mark before the first message. */
  async markRead(principal: Principal, viewingId: string): Promise<ReadReceipt> {
    const now = new Date();
    const marked = await this.messageRepository.markRead(viewingId, sideOf(principal), now);
    return { readAt: marked ? now : null };
  }

  /** A failed delivery is logged, never thrown: the message is already what the client sees. */
  private async deliver(message: EmailMessage | null, viewingId: string): Promise<void> {
    if (!message) {
      return;
    }
    try {
      await this.emailSender.send(message);
    } catch (error: unknown) {
      this.logger.warn({ err: error, viewingId }, 'Message email not delivered');
    }
  }

  private toConversation(
    record: ConversationRecord,
    side: MessageSide,
    unread: number,
  ): Conversation {
    const cover = record.listing.photos[0];
    const status = isViewingStatus(record.status) ? record.status : ViewingStatus.EXPIRED;
    const last = record.thread?.messages[0];
    const counterpart =
      side === MessageSide.TENANT
        ? record.listing.landlord
          ? {
              name: `${record.listing.landlord.firstName} ${record.listing.landlord.lastName}`,
              kind: CounterpartKind.LANDLORD,
            }
          : { name: record.listing.agency?.name ?? '', kind: CounterpartKind.AGENCY }
        : {
            name: `${record.tenant.firstName} ${record.tenant.lastName}`,
            kind: CounterpartKind.TENANT,
          };
    return {
      viewingId: record.id,
      status,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      open: status === ViewingStatus.CONFIRMED,
      side,
      listing: {
        id: record.listing.id,
        title: record.listing.title,
        coverPhotoUrl: cover
          ? (cover.url ?? (cover.storageKey ? this.storage.publicUrl(cover.storageKey) : null))
          : null,
        neighborhood: record.listing.neighborhood,
        city: record.listing.city,
        // The tenant's side learns the address with the confirmation; the owner's always has it.
        address:
          side === MessageSide.OWNER || status === ViewingStatus.CONFIRMED
            ? { line1: record.listing.addressLine1, line2: record.listing.addressLine2 }
            : null,
      },
      counterpart,
      lastMessage:
        last && isMessageSide(last.side)
          ? { body: last.body, side: last.side, createdAt: last.createdAt }
          : null,
      messageCount: record.thread?.messageCount ?? 0,
      unread,
      readAt: readAtOf(record, side),
      seenAt: readAtOf(record, otherSide(side)),
    };
  }
}

const toMessage = (record: MessageRecord): Message => ({
  id: record.id,
  viewingId: record.viewingId,
  side: isMessageSide(record.side) ? record.side : MessageSide.TENANT,
  sender: record.sender,
  body: record.body,
  createdAt: record.createdAt,
});

const readAtOf = (record: ConversationRecord, side: MessageSide): Date | null =>
  record.thread
    ? side === MessageSide.TENANT
      ? record.thread.tenantReadAt
      : record.thread.ownerReadAt
    : null;

/** Who gets the email about a message from the other side. */
const recipientOf = (record: ConversationRecord, side: MessageSide): Recipient | null =>
  side === MessageSide.TENANT
    ? { email: record.tenant.email, firstName: record.tenant.firstName }
    : record.listing.landlord
      ? { email: record.listing.landlord.email, firstName: record.listing.landlord.firstName }
      : record.listing.agency
        ? { email: record.listing.agency.email, firstName: record.listing.agency.name }
        : null;

/** A tenant writes as the tenant; a landlord, an agent (and an admin reading) as the owner's side. */
const sideOf = (principal: Principal): MessageSide =>
  principal.hasAuthority(UserRole.TENANT) ? MessageSide.TENANT : MessageSide.OWNER;

const scopeOf = (principal: Principal): ConversationScope => {
  if (principal.hasAuthority(UserRole.ADMIN)) {
    return { kind: 'ALL' };
  }
  if (principal.hasAuthority(UserRole.AGENT) && principal.agencyId) {
    return { kind: 'AGENCY', agencyId: principal.agencyId };
  }
  if (principal.hasAuthority(UserRole.LANDLORD)) {
    return { kind: 'LANDLORD', landlordId: principal.userId };
  }
  return { kind: 'TENANT', tenantId: principal.userId };
};
