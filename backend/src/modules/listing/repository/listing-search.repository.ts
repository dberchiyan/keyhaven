import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { z } from 'zod';

import type { Pageable } from '@/common/dto/pageable';
import type { PrismaService } from '@/common/persistence/prisma.service';
import { Prisma } from '@/generated/prisma/client';

import type { ListingCriteria } from '../service/filter/listing.criteria';
import { RECENT_LIMIT } from '../service/listing-limits';
import type { ListingSortField } from '../service/listing-sort';
import { ListingStatus } from '../service/listing-status';
import { publishedListingSql } from './listing-where';
import { type ViewerCardRecord, viewerCardSelect } from './record/listing.record';

const searchRowsSchema = z.array(z.object({ id: z.string(), total: z.number().int() }));
const idRowsSchema = z.array(z.object({ id: z.string() }));
const totalRowsSchema = z.array(z.object({ total: z.number().int() }));

const searchOrderBy = (field: ListingSortField, direction: Prisma.SortOrder): Prisma.Sql => {
    if (field === 'price') {
        return direction === 'asc' ? Prisma.sql`l.price ASC, l.id ASC` : Prisma.sql`l.price DESC, l.id DESC`;
    }
    return direction === 'asc'
        ? Prisma.sql`l.published_at ASC NULLS LAST, l.id ASC`
        : Prisma.sql`l.published_at DESC NULLS LAST, l.id DESC`;
};

/** The public catalogue's reads: published homes only, cards loaded by id in the order the query chose. */
@Injectable()
export class ListingSearchRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    /**
     * DATA-6: the trigram operators have no Prisma equivalent, so the page of ids and the total come from one raw
     * statement (`count(*) over ()`); the cards are then loaded by id — two statements for any page (DATA-3).
     * Past the last page the window function has no row to ride on, so the total needs its own count.
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
            return { content: [], totalElements: await this.countPublished(criteria) };
        }
        const ids = page.map((row) => row.id);
        return { content: await this.findCardsByIds(ids, viewerUserId), totalElements: page[0]?.total ?? 0 };
    }

    /** Missing or unpublished ids are left out; the rest keep the caller's order. */
    async findCardsByIds(ids: readonly string[], viewerUserId: string | null): Promise<ViewerCardRecord[]> {
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

    /** Each home once, by the latest of the person's view rows. */
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
        return totalRowsSchema.parse(rows)[0]?.total ?? 0;
    }
}
