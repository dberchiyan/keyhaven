import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../../common/persistence/prisma.service';
import { ListingStatus } from '../service/listing-status';
import { type ViewerCardRecord, viewerCardSelect } from './record/listing.record';

@Injectable()
export class SavedListingRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
  ) {}

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

  /** The tenant's saved homes that are still on the site, newest save first. */
  async findSavedPage(
    userId: string,
    page: { skip: number; take: number },
  ): Promise<{ content: ViewerCardRecord[]; totalElements: number }> {
    const where = { userId, listing: { status: ListingStatus.PUBLISHED } };
    // In parallel (api.md → Pagination): a concurrent write may make them differ by a row.
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
}
