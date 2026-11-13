import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Pageable } from '../../../common/dto/pageable';
import { toPrismaPage } from '../../../common/persistence/pageable';
import type { PrismaService } from '../../../common/persistence/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import type { ListingCriteria, ManagedListingCriteria } from '../service/filter/listing.criteria';
import type { ListingSortField, ManagedListingSortField } from '../service/listing-sort';
import type { ListingDraft, ListingScope, ListingViewer } from '../service/listing.types';
import { managedListingWhere, publishedListingSql } from './listing-where';
import { ListingStatus } from '../service/listing-status';
import {
  type CityRecord,
  citySelect,
  type ViewerDetailRecord,
  viewerDetailSelect,
  type ListingStatusRecord,
  listingStatusSelect,
  type ManagedListingCardRecord,
  managedListingCardSelect,
  type ManagedListingRecord,
  managedListingSelect,
  type ViewerCardRecord,
  viewerCardSelect,
} from './record/listing.record';

/** Cities are reference data: a handful of rows, listed whole. */
const MAX_CITIES = 100;

const searchOrderBy = (field: ListingSortField, direction: Prisma.SortOrder): Prisma.Sql =>
  field === 'price'
    ? direction === 'asc'
      ? Prisma.sql`l.price ASC, l.id ASC`
      : Prisma.sql`l.price DESC, l.id DESC`
    : direction === 'asc'
      ? Prisma.sql`l.published_at ASC NULLS LAST, l.id ASC`
      : Prisma.sql`l.published_at DESC NULLS LAST, l.id DESC`;

const managedOrderBy = (
  field: ManagedListingSortField,
  direction: Prisma.SortOrder,
): Prisma.ListingOrderByWithRelationInput[] => [{ [field]: direction }];

/** The id page of a search plus the total, from one statement (`count(*) over ()`). */
const searchRowsSchema = z.array(z.object({ id: z.string(), total: z.number().int() }));
const idRowsSchema = z.array(z.object({ id: z.string() }));
/** The two medians come back as doubles (percentile_cont); the service turns them into Decimals. */
const medianRowsSchema = z.array(
  z.object({
    neighborhoodSample: z.number().int(),
    neighborhoodMedian: z.number().nullable(),
    citySample: z.number().int(),
    cityMedian: z.number().nullable(),
  }),
);
export interface PriceMedians {
  neighborhoodSample: number;
  neighborhoodMedian: number | null;
  citySample: number;
  cityMedian: number | null;
}

/** "Similar" homes: the same kind and city, a bedroom either way, a price within this share. */
const SIMILAR_PRICE_SPREAD = 0.25;
/** The strips are short by design: a handful of cards, never a page. */
export const SIMILAR_LIMIT = 6;
export const RECENT_LIMIT = 12;

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

  cityExists(cityId: string): Promise<boolean> {
    return this.txHost.tx.city.count({ where: { id: cityId } }).then((count) => count > 0);
  }

  /**
   * Search: the matching page of ids and the total come from one raw statement (the trigram
   * operators have no Prisma equivalent); the cards are then loaded by id and put back in order.
   * Two statements for any page, never one per row.
   */
  async findPublishedPage(
    criteria: ListingCriteria,
    pageable: Pageable<ListingSortField>,
    viewerUserId: string | null,
  ): Promise<{ content: ViewerCardRecord[]; totalElements: number }> {
    const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT l.id, count(*) OVER ()::int AS total
      FROM listings l JOIN cities c ON c.id = l.city_id
      WHERE ${publishedListingSql(criteria)}
      ORDER BY ${searchOrderBy(pageable.sort.field, pageable.sort.direction)}
      LIMIT ${pageable.size} OFFSET ${pageable.page * pageable.size}`;
    const page = searchRowsSchema.parse(rows);
    if (page.length === 0) {
      // Past the last page (or nothing matches): the total still needs a count.
      return { content: [], totalElements: await this.countPublished(criteria) };
    }
    return {
      content: await this.findCardsByIds(
        page.map((row) => row.id),
        viewerUserId,
      ),
      totalElements: page[0]?.total ?? 0,
    };
  }

  /** Cards for known ids, in the given order (missing or unpublished ones are left out). */
  async findCardsByIds(
    ids: readonly string[],
    viewerUserId: string | null,
  ): Promise<ViewerCardRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const cards = await this.txHost.tx.listing.findMany({
      where: { id: { in: [...ids] }, status: ListingStatus.PUBLISHED },
      select: viewerCardSelect(viewerUserId),
    });
    const byId = new Map(cards.map((card) => [card.id, card]));
    return ids.flatMap((id) => {
      const card = byId.get(id);
      return card ? [card] : [];
    });
  }

  /**
   * Homes like this one, closest in price first: published, the same kind and city, a bedroom
   * either way, a price within a quarter of this one's — never the home itself.
   */
  async findSimilarIds(listing: {
    id: string;
    kind: string;
    cityId: string;
    bedrooms: number;
    price: Prisma.Decimal;
  }): Promise<string[]> {
    const price = listing.price.toFixed(4);
    const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT l.id
      FROM listings l
      WHERE l.status = ${ListingStatus.PUBLISHED}
        AND l.kind = ${listing.kind}
        AND l.city_id = ${listing.cityId}::uuid
        AND l.id <> ${listing.id}::uuid
        AND l.bedrooms BETWEEN ${listing.bedrooms - 1} AND ${listing.bedrooms + 1}
        AND l.price BETWEEN ${price}::numeric * ${1 - SIMILAR_PRICE_SPREAD} AND ${price}::numeric * ${1 + SIMILAR_PRICE_SPREAD}
      ORDER BY abs(l.price - ${price}::numeric) ASC, l.published_at DESC NULLS LAST, l.id ASC
      LIMIT ${SIMILAR_LIMIT}`;
    return idRowsSchema.parse(rows).map((row) => row.id);
  }

  /**
   * The median price of comparable published homes — the same kind, city and type, this one
   * excluded — for the neighborhood and for the whole city, with how many each is based on.
   * One statement: `percentile_cont` over the city, filtered once more for the neighborhood.
   */
  async findPriceMedians(listing: {
    id: string;
    kind: string;
    cityId: string;
    propertyType: string;
    neighborhood: string | null;
  }): Promise<PriceMedians> {
    const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT
        count(*) FILTER (WHERE l.neighborhood = ${listing.neighborhood ?? ''})::int AS "neighborhoodSample",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY l.price)
          FILTER (WHERE l.neighborhood = ${listing.neighborhood ?? ''}) AS "neighborhoodMedian",
        count(*)::int AS "citySample",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY l.price) AS "cityMedian"
      FROM listings l
      WHERE l.status = ${ListingStatus.PUBLISHED}
        AND l.kind = ${listing.kind}
        AND l.city_id = ${listing.cityId}::uuid
        AND l.property_type = ${listing.propertyType}
        AND l.id <> ${listing.id}::uuid`;
    return (
      medianRowsSchema.parse(rows)[0] ?? {
        neighborhoodSample: 0,
        neighborhoodMedian: null,
        citySample: 0,
        cityMedian: null,
      }
    );
  }

  /** The homes a person opened, latest first (each once), from their view rows. */
  async findRecentlyViewedIds(userId: string): Promise<string[]> {
    const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT v.listing_id AS id
      FROM listing_views v
      WHERE v.user_id = ${userId}::uuid
      GROUP BY v.listing_id
      ORDER BY max(v.created_at) DESC
      LIMIT ${RECENT_LIMIT}`;
    return idRowsSchema.parse(rows).map((row) => row.id);
  }

  private async countPublished(criteria: ListingCriteria): Promise<number> {
    const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT count(*)::int AS total
      FROM listings l JOIN cities c ON c.id = l.city_id
      WHERE ${publishedListingSql(criteria)}`;
    return z.array(z.object({ total: z.number().int() })).parse(rows)[0]?.total ?? 0;
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

  findDetailById(id: string, viewerUserId: string | null): Promise<ViewerDetailRecord | null> {
    return this.txHost.tx.listing.findUnique({
      where: { id },
      select: viewerDetailSelect(viewerUserId),
    });
  }

  findManagedById(id: string): Promise<ManagedListingRecord | null> {
    return this.txHost.tx.listing.findUnique({ where: { id }, select: managedListingSelect });
  }

  findStatusById(id: string): Promise<ListingStatusRecord | null> {
    return this.txHost.tx.listing.findUnique({ where: { id }, select: listingStatusSelect });
  }

  /** A new DRAFT owned by a landlord or an agency; returns its id. */
  async create(
    owner: { landlordId: string | null; agencyId: string | null },
    draft: ListingDraft,
    createdBy: string,
  ): Promise<string> {
    const { id } = await this.txHost.tx.listing.create({
      data: {
        ...toColumns(draft),
        landlordId: owner.landlordId,
        agencyId: owner.agencyId,
        currency: 'USD',
        status: 'DRAFT',
        createdBy,
        updatedBy: createdBy,
      },
      select: { id: true },
    });
    return id;
  }

  /** Optimistic update of the owner's fields; false when the row changed meanwhile (data.md). */
  async update(
    id: string,
    version: number,
    draft: ListingDraft,
    updatedBy: string,
  ): Promise<boolean> {
    const { count } = await this.txHost.tx.listing.updateMany({
      where: { id, version },
      data: { ...toColumns(draft), updatedBy, version: { increment: 1 } },
    });
    return count > 0;
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

  /**
   * A page view, counted once per viewer and UTC day: a person by id, a visitor without an
   * account by a daily hash (the partial unique indexes make repeats no-ops).
   */
  async recordView(listingId: string, viewer: ListingViewer, viewedOn: Date): Promise<void> {
    await this.txHost.tx.listingView.createMany({
      data: [
        viewer.kind === 'USER'
          ? { listingId, userId: viewer.userId, visitorKey: null, viewedOn }
          : { listingId, userId: null, visitorKey: viewer.visitorKey, viewedOn },
      ],
      skipDuplicates: true,
    });
  }
}

/** The draft's fields as columns — money and counts as Decimal, the day as a UTC instant. */
const toColumns = (draft: ListingDraft) => ({
  title: draft.title,
  description: draft.description,
  propertyType: draft.propertyType,
  kind: draft.kind,
  price: draft.price,
  bedrooms: draft.bedrooms,
  bathrooms: draft.bathrooms,
  sizeSqft: draft.sizeSqft,
  addressLine1: draft.addressLine1,
  addressLine2: draft.addressLine2,
  cityId: draft.cityId,
  neighborhood: draft.neighborhood,
  zip: draft.zip,
  petsAllowed: draft.petsAllowed,
  furnished: draft.furnished,
  parking: draft.parking,
  availableFrom: draft.availableFrom,
});
