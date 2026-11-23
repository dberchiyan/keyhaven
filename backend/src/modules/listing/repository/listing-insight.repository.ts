import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { z } from 'zod';

import type { PrismaService } from '@/common/persistence/prisma.service';

import type { InsightPoint, InsightTarget, InsightTotals, ListingScope } from '../service/listing.types';
import { insightTargetSql } from './listing-where';

const insightRowsSchema = z.array(z.object({ day: z.string(), views: z.number().int(), saves: z.number().int() }));
const insightTotalsSchema = z.array(z.object({ views: z.number().int(), saves: z.number().int() }));
const topRowsSchema = z.array(z.object({ id: z.string(), views: z.number().int(), saves: z.number().int() }));

export interface InsightTopRow {
    id: string;
    views: number;
    saves: number;
}

/** Views and saves counted in SQL over a window of UTC days (DATA-5: a date part Prisma cannot group by). */
@Injectable()
export class ListingInsightRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    /**
     * A row for every day of `[from, to]`, oldest first: quiet days count zero, so the chart never has holes. Views
     * are kept by their day already; a save's day is its instant in UTC (DATA-21). One statement, whatever the window.
     */
    async findSeries(target: InsightTarget, from: string, to: string): Promise<InsightPoint[]> {
        const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      WITH days AS (
        SELECT d::date AS day FROM generate_series(${from}::date, ${to}::date, '1 day') AS d
      ),
      views AS (
        SELECT v.viewed_on AS day, count(*)::int AS views
        FROM listing_views v JOIN listings l ON l.id = v.listing_id
        WHERE ${insightTargetSql(target)}
          AND v.viewed_on BETWEEN ${from}::date AND ${to}::date
        GROUP BY v.viewed_on
      ),
      saves AS (
        SELECT (s.created_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS saves
        FROM saved_listings s JOIN listings l ON l.id = s.listing_id
        WHERE ${insightTargetSql(target)}
          AND s.created_at >= ${from}::date AND s.created_at < ${to}::date + 1
        GROUP BY 1
      )
      SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
        coalesce(views.views, 0) AS views,
        coalesce(saves.saves, 0) AS saves
      FROM days
      LEFT JOIN views ON views.day = days.day
      LEFT JOIN saves ON saves.day = days.day
      ORDER BY days.day`;
        return insightRowsSchema.parse(rows);
    }

    /** Two counts for the previous window: the comparison needs the totals, not the days. */
    async countTotals(target: InsightTarget, from: string, to: string): Promise<InsightTotals> {
        const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT
        (SELECT count(*) FROM listing_views v JOIN listings l ON l.id = v.listing_id
          WHERE ${insightTargetSql(target)}
            AND v.viewed_on BETWEEN ${from}::date AND ${to}::date)::int AS views,
        (SELECT count(*) FROM saved_listings s JOIN listings l ON l.id = s.listing_id
          WHERE ${insightTargetSql(target)}
            AND s.created_at >= ${from}::date AND s.created_at < ${to}::date + 1)::int AS saves`;
        return insightTotalsSchema.parse(rows)[0] ?? { views: 0, saves: 0 };
    }

    /** Views first, saves as the tie-breaker; listings nobody looked at are left out. */
    async findTopListings(scope: ListingScope, from: string, to: string, limit: number): Promise<InsightTopRow[]> {
        const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      SELECT l.id, coalesce(v.views, 0) AS views, coalesce(s.saves, 0) AS saves
      FROM listings l
      LEFT JOIN (
        SELECT listing_id, count(*)::int AS views FROM listing_views
        WHERE viewed_on BETWEEN ${from}::date AND ${to}::date
        GROUP BY listing_id
      ) v ON v.listing_id = l.id
      LEFT JOIN (
        SELECT listing_id, count(*)::int AS saves FROM saved_listings
        WHERE created_at >= ${from}::date AND created_at < ${to}::date + 1
        GROUP BY listing_id
      ) s ON s.listing_id = l.id
      WHERE ${insightTargetSql(scope)} AND (v.views > 0 OR s.saves > 0)
      ORDER BY views DESC, saves DESC, l.id ASC
      LIMIT ${limit}`;
        return topRowsSchema.parse(rows);
    }
}
