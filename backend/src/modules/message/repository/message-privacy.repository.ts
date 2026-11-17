import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { PrismaService } from '@/common/persistence/prisma.service';

import { ConversationKind } from '../service/message-side';
import {
    type OpenedConversationExportRecord,
    openedConversationExportSelect,
    type WrittenMessageExportRecord,
    writtenMessageExportSelect,
} from './record/message.record';

/** DATA-23: the message rows an account's export reads and its erasure changes. */
@Injectable()
export class MessagePrivacyRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    /** What the person wrote and still stands, newest first, at most `take`. */
    findWrittenForExport(senderId: string, take: number): Promise<WrittenMessageExportRecord[]> {
        return this.txHost.tx.message.findMany({
            where: { senderId, isRemoved: false },
            select: writtenMessageExportSelect,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take,
        });
    }

    /** The requests to Keyhaven the person opened, newest first, at most `take`. */
    findOpenedForExport(userId: string, take: number): Promise<OpenedConversationExportRecord[]> {
        return this.txHost.tx.conversation.findMany({
            where: { kind: ConversationKind.SUPPORT, openedById: userId },
            select: openedConversationExportSelect,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take,
        });
    }

    /** One statement empties every message the person wrote; the rows stay so the threads keep their shape. */
    async removeWrittenBy(senderId: string): Promise<number> {
        const { count } = await this.txHost.tx.message.updateMany({
            where: { senderId, isRemoved: false },
            data: { body: '', isRemoved: true },
        });
        return count;
    }
}
