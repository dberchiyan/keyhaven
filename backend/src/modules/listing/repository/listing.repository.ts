import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import type { Pageable } from '../../../common/dto/pageable';
import { toPrismaPage } from '../../../common/persistence/pageable';
import type { PrismaService } from '../../../common/persistence/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';
import type { ListingCriteria, ManagedListingCriteria } from '../service/filter/listing.criteria';
import type { ListingSortField, ManagedListingSortField } from '../service/listing-sort';
import type { ListingScope } from '../service/listing.types';
import { managedListingWhere, publishedListingWhere } from './listing-where';
import {
  type CityRecord,
  citySelect,
  type ListingCardRecord,
  listingCardSelect,
  type ListingDetailRecord,
  listingDetailSelect,
  type ListingStatusRecord,
  listingStatusSelect,
  type ManagedListingCardRecord,
  managedListingCardSelect,
} from './record/listing.record';

/** Cities are reference data: a handful of rows, listed whole. */
const MAX_CITIES = 100;

const searchOrderBy = (
  field: ListingSortField,
  direction: Prisma.SortOrder,
): Prisma.ListingOrderByWithRelationInput[] =>
  field === 'rent' ? [{ rent: direction }] : [{ publishedAt: direction }];

const managedOrderBy = (
  field: ManagedListingSortField,
  direction: Prisma.SortOrder,
): Prisma.ListingOrderByWithRelationInput[] => [{ [field]: direction }];

@Injectable()
export class ListingRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
  ) {}

  findCities(): Promise<CityRecord[]> {
    return this.txHost.tx.city.findMany({
      select: citySelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: MAX_CITIES,
    });
  }

  async findPublishedPage(
    criteria: ListingCriteria,
    pageable: Pageable<ListingSortField>,
  ): Promise<{ content: ListingCardRecord[]; totalElements: number }> {
    const where = publishedListingWhere(criteria);
    const page = toPrismaPage(pageable, searchOrderBy, (direction) => ({ id: direction }));
    // In parallel (api.md → Pagination): a concurrent write may make them differ by a row.
    const [totalElements, content] = await Promise.all([
      this.txHost.tx.listing.count({ where }),
      this.txHost.tx.listing.findMany({ where, select: listingCardSelect, ...page }),
    ]);
    return { content, totalElements };
  }

  async findManagedPage(
    scope: ListingScope,
    criteria: ManagedListingCriteria,
    pageable: Pageable<ManagedListingSortField>,
  ): Promise<{ content: ManagedListingCardRecord[]; totalElements: number }> {
    const where = managedListingWhere(scope, criteria);
    const page = toPrismaPage(pageable, managedOrderBy, (direction) => ({ id: direction }));
    // In parallel (api.md → Pagination): a concurrent write may make them differ by a row.
    const [totalElements, content] = await Promise.all([
      this.txHost.tx.listing.count({ where }),
      this.txHost.tx.listing.findMany({ where, select: managedListingCardSelect, ...page }),
    ]);
    return { content, totalElements };
  }

  /** How many listings of the scope are in each status (the dashboard's summary cards). */
  async countByStatus(scope: ListingScope): Promise<{ status: string; count: number }[]> {
    const groups = await this.txHost.tx.listing.groupBy({
      by: ['status'],
      where: managedListingWhere(scope, { searchTerms: [] }),
      _count: { _all: true },
    });
    return groups.map((group) => ({ status: group.status, count: group._count._all }));
  }

  findDetailById(id: string): Promise<ListingDetailRecord | null> {
    return this.txHost.tx.listing.findUnique({ where: { id }, select: listingDetailSelect });
  }

  findStatusById(id: string): Promise<ListingStatusRecord | null> {
    return this.txHost.tx.listing.findUnique({ where: { id }, select: listingStatusSelect });
  }

  /** Optimistic update of the status; false when the row changed meanwhile (data.md). */
  async updateStatus(
    id: string,
    version: number,
    status: string,
    publishedAt: Date | null | undefined,
    updatedBy: string,
  ): Promise<boolean> {
    const { count } = await this.txHost.tx.listing.updateMany({
      where: { id, version },
      data: {
        status,
        ...(publishedAt === undefined ? {} : { publishedAt }),
        updatedBy,
        version: { increment: 1 },
      },
    });
    return count > 0;
  }
}
