import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { PrismaService } from '@/common/persistence/prisma.service';

import { ListingStatus } from '../service/listing-status';
import { type ViewerCardRecord, viewerCardSelect } from './record/listing.record';
import { type SavedHomeExportRecord, savedHomeExportSelect } from './record/listing-privacy.record';

@Injectable()
export class SavedListingRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    /** Saving twice is a no-op (the primary key). Returns true when it was new. */
    async save(userId: string, listingId: string): Promise<boolean> {
        const { count } = await this.txHost.tx.savedListing.createMany({
            data: [{ userId, listingId }],
            skipDuplicates: true,
        });
        return count > 0;
    }

    async remove(userId: string, listingId: string): Promise<boolean> {
        const { count } = await this.txHost.tx.savedListing.deleteMany({
            where: { userId, listingId },
        });
        return count > 0;
    }

    /** Only homes still on the site. API-21: count and rows in parallel, they may differ by a row. */
    async findSavedPage(
        userId: string,
        page: { skip: number; take: number },
    ): Promise<{ content: ViewerCardRecord[]; totalElements: number }> {
        const where = { userId, listing: { status: ListingStatus.PUBLISHED } };
        const [totalElements, rows] = await Promise.all([
            this.txHost.tx.savedListing.count({ where }),
            this.txHost.tx.savedListing.findMany({
                where,
                select: { listing: { select: viewerCardSelect(userId) } },
                orderBy: [{ createdAt: 'desc' }, { listingId: 'desc' }],
                skip: page.skip,
                take: page.take,
            }),
        ]);
        return { content: rows.map((row) => row.listing), totalElements };
    }

    /** Every saved home, whatever its status now, newest first, at most `take`. */
    findForExport(userId: string, take: number): Promise<SavedHomeExportRecord[]> {
        return this.txHost.tx.savedListing.findMany({
            where: { userId },
            select: savedHomeExportSelect,
            orderBy: [{ createdAt: 'desc' }, { listingId: 'desc' }],
            take,
        });
    }

    async deleteByUser(userId: string): Promise<number> {
        const { count } = await this.txHost.tx.savedListing.deleteMany({ where: { userId } });
        return count;
    }
}
