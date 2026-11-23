import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { PrismaService } from '@/common/persistence/prisma.service';
import type { Prisma } from '@/generated/prisma/client';

import { MAX_SAVED_SEARCHES } from '../service/saved-search-limits';
import { type SavedSearchRecord, savedSearchSelect } from './record/saved-search.record';

/** DATA-40: a digest run is bounded; the rest wait for the next day's run. */
const MAX_DIGEST_PER_RUN = 500;

@Injectable()
export class SavedSearchRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    /** The person's searches, newest first — bounded by MAX_SAVED_SEARCHES. */
    findByUser(userId: string): Promise<SavedSearchRecord[]> {
        return this.txHost.tx.savedSearch.findMany({
            where: { userId },
            select: savedSearchSelect,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: MAX_SAVED_SEARCHES,
        });
    }

    findById(userId: string, id: string): Promise<SavedSearchRecord | null> {
        return this.txHost.tx.savedSearch.findFirst({
            where: { id, userId },
            select: savedSearchSelect,
        });
    }

    async deleteByUser(userId: string): Promise<number> {
        const { count } = await this.txHost.tx.savedSearch.deleteMany({ where: { userId } });
        return count;
    }

    countByUser(userId: string): Promise<number> {
        return this.txHost.tx.savedSearch.count({ where: { userId } });
    }

    async create(
        userId: string,
        name: string,
        criteria: Prisma.InputJsonValue,
        hasEmailAlerts: boolean,
    ): Promise<string> {
        const { id } = await this.txHost.tx.savedSearch.create({
            data: { userId, name, criteria, hasEmailAlerts, createdBy: userId, updatedBy: userId },
            select: { id: true },
        });
        return id;
    }

    /** Optimistic update of name and alerts; false when the row changed meanwhile. */
    async update(
        userId: string,
        id: string,
        version: number,
        data: { name: string; hasEmailAlerts: boolean },
    ): Promise<boolean> {
        const { count } = await this.txHost.tx.savedSearch.updateMany({
            where: { id, userId, version },
            data: { ...data, updatedBy: userId, version: { increment: 1 } },
        });
        return count > 0;
    }

    async remove(userId: string, id: string): Promise<void> {
        await this.txHost.tx.savedSearch.deleteMany({ where: { id, userId } });
    }

    /** Searches with alerts on, oldest notification first (never-notified ones first of all). */
    findForDigest(): Promise<SavedSearchRecord[]> {
        return this.txHost.tx.savedSearch.findMany({
            where: { hasEmailAlerts: true },
            select: savedSearchSelect,
            orderBy: [{ lastNotifiedAt: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
            take: MAX_DIGEST_PER_RUN,
        });
    }

    async markNotified(id: string, at: Date): Promise<void> {
        await this.txHost.tx.savedSearch.updateMany({ where: { id }, data: { lastNotifiedAt: at } });
    }
}
