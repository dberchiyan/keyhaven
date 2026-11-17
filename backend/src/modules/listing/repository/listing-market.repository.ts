import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { z } from 'zod';

import { MONEY_SCALE } from '@/common/persistence/money';
import type { PrismaService } from '@/common/persistence/prisma.service';
import type { Prisma } from '@/generated/prisma/client';

import { SIMILAR_LIMIT } from '../service/listing-limits';
import { ListingStatus } from '../service/listing-status';

const SIMILAR_PRICE_SPREAD = 0.25;

const idRowsSchema = z.array(z.object({ id: z.string() }));
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

export interface ComparableListing {
    id: string;
    kind: string;
    cityId: string;
}

export interface SimilarityBase extends ComparableListing {
    bedrooms: number;
    price: Prisma.Decimal;
}

export interface PriceComparisonBase extends ComparableListing {
    propertyType: string;
    neighborhood: string | null;
}

/** Comparable published homes: the same kind and city as one listing, never that listing itself. */
@Injectable()
export class ListingMarketRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    /** A bedroom either way and a price within a quarter of this one's, closest in price first. */
    async findSimilarIds(listing: SimilarityBase): Promise<string[]> {
        const price = listing.price.toFixed(MONEY_SCALE);
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
     * The median price of the same type for the neighborhood and for the whole city, with how many homes each rests
     * on. One statement: `percentile_cont` over the city, filtered once more for the neighborhood. The medians come
     * back as doubles; the caller turns them into Decimals (DATA-20).
     */
    async findPriceMedians(listing: PriceComparisonBase): Promise<PriceMedians> {
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
}
