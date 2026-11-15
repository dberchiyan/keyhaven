import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { PrismaService } from '../../../common/persistence/prisma.service';
import { MAX_CONVERSATIONS, MAX_THREAD_MESSAGES } from '../service/message-limits';
import { MessageSide, otherSide } from '../service/message-side';
import type { ConversationScope } from '../service/message.types';
import { conversationScopeSql, readAtSql } from './conversation-where';
import {
  type ConversationRecord,
  conversationSelect,
  type MessageRecord,
  messageSelect,
  type ParticipantsRecord,
  participantsSelect,
} from './record/message.record';

const inboxRowsSchema = z.array(z.object({ id: z.string(), unread: z.number().int().min(0) }));
const unreadRowsSchema = z.array(z.object({ unread: z.number().int().min(0) }));

/** The column a side's read marker lives in, for Prisma writes. */
const readAtField = (side: MessageSide): 'tenantReadAt' | 'ownerReadAt' =>
  side === MessageSide.TENANT ? 'tenantReadAt' : 'ownerReadAt';

@Injectable()
export class MessageRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
  ) {}

  /**
   * The inbox: every confirmed viewing in the scope (a conversation exists once the owner said
   * yes, even before the first message) plus the threads that outlived their viewing, latest
   * message first, with the caller's side's unread count — one statement, bounded.
   */
  async findInbox(
    scope: ConversationScope,
    side: MessageSide,
  ): Promise<{ id: string; unread: number }[]> {
    const other = otherSide(side);
    const readAt = readAtSql(side);
    const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT v.id,
             (SELECT count(*)::int
                FROM viewing_messages m
               WHERE m.viewing_id = v.id
                 AND m.side = ${other}
                 AND (${readAt} IS NULL OR m.created_at > ${readAt})) AS unread
        FROM viewings v
        JOIN listings l ON l.id = v.listing_id
        LEFT JOIN viewing_threads t ON t.viewing_id = v.id
       WHERE ${conversationScopeSql(scope)}
         AND (v.status = 'CONFIRMED' OR t.viewing_id IS NOT NULL)
       ORDER BY t.last_message_at DESC NULLS LAST, v.starts_at DESC, v.id DESC
       LIMIT ${MAX_CONVERSATIONS}`;
    return inboxRowsSchema.parse(rows);
  }

  /** Messages from the other side the caller has not read, over the whole scope (the badge). */
  async countUnreadInScope(scope: ConversationScope, side: MessageSide): Promise<number> {
    const other = otherSide(side);
    const readAt = readAtSql(side);
    const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT count(*)::int AS unread
        FROM viewing_messages m
        JOIN viewing_threads t ON t.viewing_id = m.viewing_id
        JOIN viewings v ON v.id = m.viewing_id
        JOIN listings l ON l.id = v.listing_id
       WHERE ${conversationScopeSql(scope)}
         AND m.side = ${other}
         AND (${readAt} IS NULL OR m.created_at > ${readAt})`;
    return unreadRowsSchema.parse(rows)[0]?.unread ?? 0;
  }

  /** The conversations of the given ids, in the given order (the inbox statement ranked them). */
  async findConversationsByIds(ids: readonly string[]): Promise<ConversationRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.txHost.tx.viewing.findMany({
      where: { id: { in: [...ids] } },
      select: conversationSelect,
      // Bounded by the inbox statement's LIMIT.
      take: MAX_CONVERSATIONS,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
  }

  findConversation(viewingId: string): Promise<ConversationRecord | null> {
    return this.txHost.tx.viewing.findUnique({
      where: { id: viewingId },
      select: conversationSelect,
    });
  }

  findParticipants(viewingId: string): Promise<ParticipantsRecord | null> {
    return this.txHost.tx.viewing.findUnique({
      where: { id: viewingId },
      select: participantsSelect,
    });
  }

  /** The whole thread, oldest first — bounded by MAX_THREAD_MESSAGES (the cap writing enforces). */
  findMessages(viewingId: string): Promise<MessageRecord[]> {
    return this.txHost.tx.viewingMessage.findMany({
      where: { viewingId },
      select: messageSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: MAX_THREAD_MESSAGES,
    });
  }

  /** Messages of `side` written after `since` (null: ever) — what the other side has not read. */
  countSince(viewingId: string, side: MessageSide, since: Date | null): Promise<number> {
    return this.txHost.tx.viewingMessage.count({
      where: { viewingId, side, ...(since ? { createdAt: { gt: since } } : {}) },
    });
  }

  /**
   * Appends a message: the thread row is created with the first one, its latest time and count
   * move with every one, and the writer's own read marker moves too (they read what they wrote).
   */
  async create(
    data: { viewingId: string; senderId: string; side: MessageSide; body: string },
    now: Date,
  ): Promise<MessageRecord> {
    const field = readAtField(data.side);
    await this.txHost.tx.viewingThread.upsert({
      where: { viewingId: data.viewingId },
      create: { viewingId: data.viewingId, lastMessageAt: now, messageCount: 1, [field]: now },
      update: { lastMessageAt: now, messageCount: { increment: 1 }, [field]: now },
      select: { viewingId: true },
    });
    return this.txHost.tx.viewingMessage.create({
      data: {
        viewingId: data.viewingId,
        senderId: data.senderId,
        side: data.side,
        body: data.body,
        createdAt: now,
      },
      select: messageSelect,
    });
  }

  /** Moves a side's read marker to `at`; false when the viewing has no thread yet (nothing to read). */
  async markRead(viewingId: string, side: MessageSide, at: Date): Promise<boolean> {
    const { count } = await this.txHost.tx.viewingThread.updateMany({
      where: { viewingId },
      data: { [readAtField(side)]: at },
    });
    return count > 0;
  }
}
