import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { z } from 'zod';

import type { PrismaService } from '@/common/persistence/prisma.service';

import type { InboxScope } from '../service/message.types';
import { MAX_CONVERSATIONS, MAX_THREAD_MESSAGES } from '../service/message-limits';
import { ConversationKind, MessageSide, otherSide } from '../service/message-side';
import { readAtSql, supportScopeSql, viewingScopeSql } from './conversation-where';
import {
    type MessageRecord,
    messageSelect,
    type SupportConversationRecord,
    supportConversationSelect,
    type SupportParticipantsRecord,
    supportParticipantsSelect,
    type ViewingConversationRecord,
    viewingConversationSelect,
    type ViewingParticipantsRecord,
    viewingParticipantsSelect,
} from './record/message.record';

const inboxRowsSchema = z.array(
    z.object({
        id: z.string(),
        kind: z.enum([ConversationKind.VIEWING, ConversationKind.SUPPORT]),
        unread: z.number().int().min(0),
    }),
);
export type InboxRow = z.infer<typeof inboxRowsSchema>[number];
const unreadRowsSchema = z.array(z.object({ unread: z.number().int().min(0) }));

/** The column a side's read marker lives in, for Prisma writes. */
const readAtField = (side: MessageSide): 'requesterReadAt' | 'responderReadAt' =>
    side === MessageSide.REQUESTER ? 'requesterReadAt' : 'responderReadAt';

@Injectable()
export class MessageRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    /**
     * The inbox: every confirmed viewing in the scope (a conversation exists once the owner said
     * yes, even before the first message) plus the threads that outlived their viewing, and the
     * support requests in the scope — latest message first, with the caller's side's unread count
     * per row. One statement, bounded.
     */
    async findInbox(scope: InboxScope): Promise<InboxRow[]> {
        const viewingOther = otherSide(scope.viewingSide);
        const viewingReadAt = readAtSql(scope.viewingSide);
        const supportOther = otherSide(scope.supportSide);
        const supportReadAt = readAtSql(scope.supportSide);
        const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT id, kind, unread FROM (
        SELECT v.id, 'VIEWING' AS kind, c.last_message_at, v.starts_at AS opened_at,
               (SELECT count(*)::int
                  FROM messages m
                 WHERE m.conversation_id = v.id
                   AND m.side = ${viewingOther}
                   AND (${viewingReadAt} IS NULL OR m.created_at > ${viewingReadAt})) AS unread
          FROM viewings v
          JOIN listings l ON l.id = v.listing_id
          LEFT JOIN conversations c ON c.id = v.id
         WHERE ${viewingScopeSql(scope.viewing)}
           AND (v.status = 'CONFIRMED' OR c.id IS NOT NULL)
        UNION ALL
        SELECT c.id, 'SUPPORT' AS kind, c.last_message_at, c.created_at AS opened_at,
               (SELECT count(*)::int
                  FROM messages m
                 WHERE m.conversation_id = c.id
                   AND m.side = ${supportOther}
                   AND (${supportReadAt} IS NULL OR m.created_at > ${supportReadAt})) AS unread
          FROM conversations c
         WHERE c.kind = 'SUPPORT' AND ${supportScopeSql(scope.support)}
      ) rows
      ORDER BY last_message_at DESC NULLS LAST, opened_at DESC, id DESC
      LIMIT ${MAX_CONVERSATIONS}`;
        return inboxRowsSchema.parse(rows);
    }

    /** Messages from the other side the caller has not read, over the whole scope (the badge). */
    async countUnreadInScope(scope: InboxScope): Promise<number> {
        const viewingOther = otherSide(scope.viewingSide);
        const viewingReadAt = readAtSql(scope.viewingSide);
        const supportOther = otherSide(scope.supportSide);
        const supportReadAt = readAtSql(scope.supportSide);
        const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT (
        (SELECT count(*)::int
           FROM messages m
           JOIN conversations c ON c.id = m.conversation_id
           JOIN viewings v ON v.id = c.viewing_id
           JOIN listings l ON l.id = v.listing_id
          WHERE c.kind = 'VIEWING' AND ${viewingScopeSql(scope.viewing)}
            AND m.side = ${viewingOther}
            AND (${viewingReadAt} IS NULL OR m.created_at > ${viewingReadAt}))
        +
        (SELECT count(*)::int
           FROM messages m
           JOIN conversations c ON c.id = m.conversation_id
          WHERE c.kind = 'SUPPORT' AND ${supportScopeSql(scope.support)}
            AND m.side = ${supportOther}
            AND (${supportReadAt} IS NULL OR m.created_at > ${supportReadAt}))
      ) AS unread`;
        return unreadRowsSchema.parse(rows)[0]?.unread ?? 0;
    }

    /** The viewings' conversations of the given ids (any order; the caller ranks them), bounded like the inbox's LIMIT. */
    findViewingConversations(ids: readonly string[]): Promise<ViewingConversationRecord[]> {
        if (ids.length === 0) {
            return Promise.resolve([]);
        }
        return this.txHost.tx.viewing.findMany({
            where: { id: { in: [...ids] } },
            select: viewingConversationSelect,
            take: MAX_CONVERSATIONS,
        });
    }

    findSupportConversations(ids: readonly string[]): Promise<SupportConversationRecord[]> {
        if (ids.length === 0) {
            return Promise.resolve([]);
        }
        return this.txHost.tx.conversation.findMany({
            where: { id: { in: [...ids] }, kind: ConversationKind.SUPPORT },
            select: supportConversationSelect,
            take: MAX_CONVERSATIONS,
        });
    }

    findViewingConversation(viewingId: string): Promise<ViewingConversationRecord | null> {
        return this.txHost.tx.viewing.findUnique({
            where: { id: viewingId },
            select: viewingConversationSelect,
        });
    }

    findSupportConversation(id: string): Promise<SupportConversationRecord | null> {
        return this.txHost.tx.conversation.findUnique({
            where: { id, kind: ConversationKind.SUPPORT },
            select: supportConversationSelect,
        });
    }

    findViewingParticipants(viewingId: string): Promise<ViewingParticipantsRecord | null> {
        return this.txHost.tx.viewing.findUnique({
            where: { id: viewingId },
            select: viewingParticipantsSelect,
        });
    }

    findSupportParticipants(id: string): Promise<SupportParticipantsRecord | null> {
        return this.txHost.tx.conversation.findUnique({
            where: { id, kind: ConversationKind.SUPPORT },
            select: supportParticipantsSelect,
        });
    }

    /** A member's support requests still open (the cap on starting new ones). */
    countOpenSupportByUser(userId: string): Promise<number> {
        return this.txHost.tx.conversation.count({
            where: { kind: ConversationKind.SUPPORT, openedById: userId, closedAt: null },
        });
    }

    async listingExists(listingId: string): Promise<boolean> {
        const count = await this.txHost.tx.listing.count({ where: { id: listingId } });
        return count > 0;
    }

    /** The whole thread, oldest first — bounded by MAX_THREAD_MESSAGES (the cap writing enforces). */
    findMessages(conversationId: string): Promise<MessageRecord[]> {
        return this.txHost.tx.message.findMany({
            where: { conversationId },
            select: messageSelect,
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            take: MAX_THREAD_MESSAGES,
        });
    }

    /** Messages of `side` written after `since` (null: ever) — what the other side has not read. */
    countSince(conversationId: string, side: MessageSide, since: Date | null): Promise<number> {
        return this.txHost.tx.message.count({
            where: { conversationId, side, ...(since ? { createdAt: { gt: since } } : {}) },
        });
    }

    /**
     * Appends a message to a viewing's conversation: the row is created with the first one (its
     * id is the viewing's), its latest time and count move with every one, and the writer's own
     * read marker moves too (they read what they wrote).
     */
    async createInViewing(
        data: { viewingId: string; senderId: string; side: MessageSide; body: string },
        now: Date,
    ): Promise<MessageRecord> {
        const field = readAtField(data.side);
        await this.txHost.tx.conversation.upsert({
            where: { id: data.viewingId },
            create: {
                id: data.viewingId,
                kind: ConversationKind.VIEWING,
                viewingId: data.viewingId,
                lastMessageAt: now,
                messageCount: 1,
                [field]: now,
            },
            update: { lastMessageAt: now, messageCount: { increment: 1 }, [field]: now },
            select: { id: true },
        });
        return this.createMessage(data.viewingId, data.senderId, data.side, data.body, now);
    }

    /** Appends to an existing support request (the writer's marker moves as above). */
    async createInSupport(
        data: { conversationId: string; senderId: string; side: MessageSide; body: string },
        now: Date,
    ): Promise<MessageRecord> {
        await this.txHost.tx.conversation.update({
            where: { id: data.conversationId },
            data: { lastMessageAt: now, messageCount: { increment: 1 }, [readAtField(data.side)]: now },
            select: { id: true },
        });
        return this.createMessage(data.conversationId, data.senderId, data.side, data.body, now);
    }

    /** A new support request with its first message; the opener has read what they wrote. */
    async createSupport(
        data: { subject: string; listingId: string | null; openedById: string; body: string },
        now: Date,
    ): Promise<string> {
        const { id } = await this.txHost.tx.conversation.create({
            data: {
                kind: ConversationKind.SUPPORT,
                subject: data.subject,
                listingId: data.listingId,
                openedById: data.openedById,
                lastMessageAt: now,
                messageCount: 1,
                requesterReadAt: now,
            },
            select: { id: true },
        });
        await this.createMessage(id, data.openedById, MessageSide.REQUESTER, data.body, now);
        return id;
    }

    private createMessage(
        conversationId: string,
        senderId: string,
        side: MessageSide,
        body: string,
        createdAt: Date,
    ): Promise<MessageRecord> {
        return this.txHost.tx.message.create({
            data: { conversationId, senderId, side, body, createdAt },
            select: messageSelect,
        });
    }

    /** Moves a side's read marker to `at`; false when the conversation has no row yet (nothing to read). */
    async markRead(conversationId: string, side: MessageSide, at: Date): Promise<boolean> {
        const { count } = await this.txHost.tx.conversation.updateMany({
            where: { id: conversationId },
            data: { [readAtField(side)]: at },
        });
        return count > 0;
    }

    /** Closes or reopens a support request; false when nothing changed (already so). */
    async setClosed(id: string, closedAt: Date | null): Promise<boolean> {
        const { count } = await this.txHost.tx.conversation.updateMany({
            where: {
                id,
                kind: ConversationKind.SUPPORT,
                closedAt: closedAt === null ? { not: null } : null,
            },
            data: { closedAt },
        });
        return count > 0;
    }
}
