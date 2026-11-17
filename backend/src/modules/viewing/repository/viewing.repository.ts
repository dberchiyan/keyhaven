import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { Pageable } from '@/common/dto/pageable';
import { toPrismaPage } from '@/common/persistence/pageable';
import type { PrismaService } from '@/common/persistence/prisma.service';
import type { Prisma } from '@/generated/prisma/client';

import type { ViewingCriteria, ViewingScope } from '../service/viewing.types';
import { MAX_LISTING_VIEWINGS, MAX_OWN_VIEWINGS } from '../service/viewing-limits';
import type { ViewingSortField } from '../service/viewing-sort';
import { type CancelledBy, ViewingStatus } from '../service/viewing-status';
import {
    type BookableListingRecord,
    bookableListingSelect,
    type ViewingRecord,
    viewingSelect,
    type ViewingStatusRecord,
    viewingStatusSelect,
} from './record/viewing.record';
import { activeViewingWhere, managedViewingWhere } from './viewing-where';

/** DATA-40: rows a scheduler run handles at most; the next hourly run takes the rest. */
const MAX_JOB_ROWS = 500;
/** DATA-8: the slots of the listed window are a few hundred at most, never more. */
const MAX_TAKEN_STARTS = 1000;

const orderBy = (field: ViewingSortField, direction: Prisma.SortOrder): Prisma.ViewingOrderByWithRelationInput[] => [
    { [field]: direction },
];

@Injectable()
export class ViewingRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    findBookable(listingId: string): Promise<BookableListingRecord | null> {
        return this.txHost.tx.listing.findUnique({
            where: { id: listingId },
            select: bookableListingSelect,
        });
    }

    /** The starts of the live viewings of a home in a window: what is already taken. */
    async findActiveStartsBetween(listingId: string, from: Date, to: Date): Promise<Date[]> {
        const rows = await this.txHost.tx.viewing.findMany({
            where: { listingId, startsAt: { gte: from, lte: to }, ...activeViewingWhere },
            select: { startsAt: true },
            take: MAX_TAKEN_STARTS,
        });
        return rows.map((row) => row.startsAt);
    }

    countActiveByTenant(tenantId: string, now: Date): Promise<number> {
        return this.txHost.tx.viewing.count({
            where: { tenantId, startsAt: { gt: now }, ...activeViewingWhere },
        });
    }

    async hasActiveByTenantAndListing(tenantId: string, listingId: string): Promise<boolean> {
        const count = await this.txHost.tx.viewing.count({
            where: { tenantId, listingId, ...activeViewingWhere },
        });
        return count > 0;
    }

    /** The tenant may see the exact address: a confirmed viewing, ahead or already held. */
    async hasConfirmedByTenantAndListing(tenantId: string, listingId: string): Promise<boolean> {
        const count = await this.txHost.tx.viewing.count({
            where: { tenantId, listingId, status: ViewingStatus.CONFIRMED },
        });
        return count > 0;
    }

    /** Throws Prisma's unique violation when the slot (or the tenant's live viewing) exists. */
    async create(
        data: {
            listingId: string;
            tenantId: string;
            startsAt: Date;
            endsAt: Date;
            message: string | null;
        },
        actorUserId: string,
    ): Promise<string> {
        const { id } = await this.txHost.tx.viewing.create({
            data: {
                ...data,
                status: ViewingStatus.REQUESTED,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
            select: { id: true },
        });
        return id;
    }

    findById(id: string): Promise<ViewingRecord | null> {
        return this.txHost.tx.viewing.findUnique({ where: { id }, select: viewingSelect });
    }

    findStatusById(id: string): Promise<ViewingStatusRecord | null> {
        return this.txHost.tx.viewing.findUnique({ where: { id }, select: viewingStatusSelect });
    }

    /** A tenant's viewings, latest slot first — bounded by MAX_OWN_VIEWINGS. */
    findByTenant(tenantId: string): Promise<ViewingRecord[]> {
        return this.txHost.tx.viewing.findMany({
            where: { tenantId },
            select: viewingSelect,
            orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
            take: MAX_OWN_VIEWINGS,
        });
    }

    /** One home's live viewings ahead, soonest first — bounded by MAX_LISTING_VIEWINGS. */
    findUpcomingByListing(listingId: string, now: Date): Promise<ViewingRecord[]> {
        return this.txHost.tx.viewing.findMany({
            where: { listingId, startsAt: { gt: now }, ...activeViewingWhere },
            select: viewingSelect,
            orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
            take: MAX_LISTING_VIEWINGS,
        });
    }

    /** API-21: count and rows in parallel — a concurrent write may make them differ by a row. */
    async findPage(
        scope: ViewingScope,
        criteria: ViewingCriteria,
        pageable: Pageable<ViewingSortField>,
        now: Date,
    ): Promise<{ content: ViewingRecord[]; totalElements: number }> {
        const where = managedViewingWhere(scope, criteria, now);
        const page = toPrismaPage(pageable, orderBy, (direction) => ({ id: direction }));
        const [totalElements, content] = await Promise.all([
            this.txHost.tx.viewing.count({ where }),
            this.txHost.tx.viewing.findMany({ where, select: viewingSelect, ...page }),
        ]);
        return { content, totalElements };
    }

    /** Requests waiting and confirmed viewings ahead, for the dashboard badge. */
    async countSummary(scope: ViewingScope, now: Date): Promise<{ requested: number; upcoming: number }> {
        const [requested, upcoming] = await Promise.all([
            this.txHost.tx.viewing.count({
                where: managedViewingWhere(scope, { status: ViewingStatus.REQUESTED, isUpcoming: true }, now),
            }),
            this.txHost.tx.viewing.count({
                where: managedViewingWhere(scope, { status: ViewingStatus.CONFIRMED, isUpcoming: true }, now),
            }),
        ]);
        return { requested, upcoming };
    }

    /** DATA-16: optimistic status change; false when the row changed meanwhile. */
    async updateStatus(
        id: string,
        version: number,
        data: {
            status: ViewingStatus;
            note: string | null;
            cancelledBy: CancelledBy | null;
            decidedAt: Date;
        },
        actorUserId: string | null,
    ): Promise<boolean> {
        const { count } = await this.txHost.tx.viewing.updateMany({
            where: { id, version },
            data: { ...data, updatedBy: actorUserId, version: { increment: 1 } },
        });
        return count > 0;
    }

    /** Requests whose slot started unanswered, oldest first (the scheduler expires them). */
    findUnansweredBefore(now: Date): Promise<ViewingStatusRecord[]> {
        return this.txHost.tx.viewing.findMany({
            where: { status: ViewingStatus.REQUESTED, startsAt: { lte: now } },
            select: viewingStatusSelect,
            orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
            take: MAX_JOB_ROWS,
        });
    }

    /** Confirmed viewings starting within the window that were not reminded yet, soonest first. */
    findReminderDue(now: Date, until: Date): Promise<ViewingRecord[]> {
        return this.txHost.tx.viewing.findMany({
            where: {
                status: ViewingStatus.CONFIRMED,
                reminderSentAt: null,
                startsAt: { gt: now, lte: until },
            },
            select: viewingSelect,
            orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
            take: MAX_JOB_ROWS,
        });
    }

    /** DATA-40: marks the reminder as sent; false when another run got there first. */
    /** The ids this run marked; a row another instance marked first is left out (DATA-40). */
    async markReminded(ids: readonly string[], at: Date): Promise<string[]> {
        const rows = await this.txHost.tx.viewing.updateManyAndReturn({
            where: { id: { in: [...ids] }, reminderSentAt: null },
            data: { reminderSentAt: at },
            select: { id: true },
        });
        return rows.map((row) => row.id);
    }

    /** Requests still unanswered among `ids` become EXPIRED in one statement; returns the ids it changed. */
    async expireRequested(ids: readonly string[], decidedAt: Date): Promise<string[]> {
        const rows = await this.txHost.tx.viewing.updateManyAndReturn({
            where: { id: { in: [...ids] }, status: ViewingStatus.REQUESTED },
            data: {
                status: ViewingStatus.EXPIRED,
                note: null,
                cancelledBy: null,
                decidedAt,
                updatedBy: null,
                version: { increment: 1 },
            },
            select: { id: true },
        });
        return rows.map((row) => row.id);
    }

    findByIds(ids: readonly string[]): Promise<ViewingRecord[]> {
        return this.txHost.tx.viewing.findMany({ where: { id: { in: [...ids] } }, select: viewingSelect });
    }
}
