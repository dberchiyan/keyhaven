import { createHash } from 'node:crypto';

import type { PrismaClient } from '@/generated/prisma/client';
import { ListingStatus } from '@/modules/listing/service/listing-status';

import { LISTING_COUNT, SALE_LISTING_COUNT } from './seed-listings';
import { cycle, random } from './seed-random';

const HISTORY_DAYS = 180;
const MIN_VIEWS = 250;
const VIEWS_SPREAD = 1250;
const DAY_MS = 86_400_000;
const CREATE_MANY_BATCH_SIZE = 1000;
const RENTER_SHARE = 0.15;
const SAVE_SHARE = 0.07;

/** A visitor's daily hash, as the app would store one (never an address in clear). */
const visitorKey = (listingId: string, day: string, visit: number): string =>
    createHash('sha256').update(`keyhaven-seed:${listingId}:${day}:${visit}`).digest('hex');

const utcDay = (instant: Date): Date =>
    new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()));

interface ViewRow {
    listingId: string;
    userId: string | null;
    visitorKey: string | null;
    viewedOn: Date;
    createdAt: Date;
}
interface SaveRow {
    userId: string;
    listingId: string;
    createdAt: Date;
}

interface ActivityRun {
    roll: () => number;
    tenantIds: readonly string[];
    today: Date;
    viewRows: ViewRow[];
    saveRows: Map<string, SaveRow>;
}

interface ListingDay {
    listingId: string;
    listingIndex: number;
    day: Date;
    dayIndex: number;
}

/** Freshness, weekends and noise; today is still young, so it weighs less. */
const dayWeight = (run: ActivityRun, day: Date, publishedOn: Date): number => {
    const age = Math.round((day.getTime() - publishedOn.getTime()) / DAY_MS);
    const weekday = day.getUTCDay();
    return (
        (weekday === 0 || weekday === 6 ? 1.25 : 1) *
        (age < 10 ? 1.8 : age < 30 ? 1.1 : 0.85) *
        (day.getTime() === run.today.getTime() ? 0.35 : 1) *
        (0.4 + run.roll() * 1.2)
    );
};

const weightedDays = (run: ActivityRun, firstDay: Date, publishedOn: Date): { day: Date; weight: number }[] => {
    const days: { day: Date; weight: number }[] = [];
    for (let day = firstDay; day <= run.today; day = new Date(day.getTime() + DAY_MS)) {
        days.push({ day, weight: dayWeight(run, day, publishedOn) });
    }
    return days;
};

/** Renters are distinct within a day (the per-day unique on person + home); the rest are visitors. */
const addDayVisits = (run: ActivityRun, at: ListingDay, count: number): void => {
    const dayIso = at.day.toISOString().slice(0, 10);
    let renters = 0;
    for (let visit = 0; visit < count; visit += 1) {
        const createdAt = new Date(at.day.getTime() + Math.floor((6 + run.roll() * 16) * 60) * 60_000);
        const byRenter = run.roll() < RENTER_SHARE && renters < run.tenantIds.length;
        const renterId = cycle(run.tenantIds, at.listingIndex * 7 + at.dayIndex * 3 + renters);
        if (byRenter) {
            renters += 1;
        }
        run.viewRows.push({
            listingId: at.listingId,
            userId: byRenter ? renterId : null,
            visitorKey: byRenter ? null : visitorKey(at.listingId, dayIso, visit),
            viewedOn: at.day,
            createdAt,
        });
        if (run.roll() < SAVE_SHARE) {
            const saverId = byRenter ? renterId : cycle(run.tenantIds, at.listingIndex * 5 + at.dayIndex + visit);
            addSave(run, { userId: saverId, listingId: at.listingId, createdAt });
        }
    }
};

const addSave = (run: ActivityRun, save: SaveRow): void => {
    const key = `${save.userId}:${save.listingId}`;
    if (!run.saveRows.has(key)) {
        run.saveRows.set(key, save);
    }
};

/**
 * `MIN_VIEWS` is a user decision (2026-11-15); squaring the roll skews most homes towards it and a few far above.
 * Cumulative rounding makes the day counts add up to the drawn total exactly.
 */
const addListingActivity = (
    run: ActivityRun,
    listing: { id: string; publishedAt: Date | null },
    listingIndex: number,
    historyStart: Date,
): void => {
    const target = MIN_VIEWS + Math.floor(run.roll() ** 2 * VIEWS_SPREAD);
    const publishedOn = utcDay(listing.publishedAt ?? run.today);
    const firstDay = publishedOn > historyStart ? publishedOn : historyStart;
    const days = weightedDays(run, firstDay, publishedOn);
    const totalWeight = days.reduce((sum, entry) => sum + entry.weight, 0);
    let cumulativeWeight = 0;
    let allocated = 0;
    days.forEach(({ day, weight }, dayIndex) => {
        cumulativeWeight += weight;
        const count = Math.round((target * cumulativeWeight) / totalWeight) - allocated;
        allocated += count;
        addDayVisits(run, { listingId: listing.id, listingIndex, day, dayIndex }, count);
    });
};

/** Batched inserts; the unique keys make a re-run add nothing. */
const insertActivity = async (
    prisma: PrismaClient,
    viewRows: ViewRow[],
    saveList: SaveRow[],
): Promise<{ views: number; saves: number }> => {
    let views = 0;
    for (let start = 0; start < viewRows.length; start += CREATE_MANY_BATCH_SIZE) {
        const created = await prisma.listingView.createMany({
            data: viewRows.slice(start, start + CREATE_MANY_BATCH_SIZE),
            skipDuplicates: true,
        });
        views += created.count;
    }
    let saves = 0;
    for (let start = 0; start < saveList.length; start += CREATE_MANY_BATCH_SIZE) {
        const created = await prisma.savedListing.createMany({
            data: saveList.slice(start, start + CREATE_MANY_BATCH_SIZE),
            skipDuplicates: true,
        });
        saves += created.count;
    }
    return { views, saves };
};

/**
 * Views and saves of the showcase listings over the last months, so the owners' insights have something to show on
 * day one: each published home draws a random total of views (never under `MIN_VIEWS`, a long tail above), spread over
 * its days on the site with more right after publishing and at weekends; most visits come from anonymous visitors,
 * some from the seeded renters, and a share of the visits ends in a save. Every row is deterministic and carries a
 * unique key (visitor + day, person + day, person + home), so a re-run adds nothing. The catalogue read is bounded by
 * the seed's own size.
 */
export const seedActivity = async (
    prisma: PrismaClient,
    tenantIds: readonly string[],
    today: Date,
): Promise<{ views: number; saves: number }> => {
    const listings = await prisma.listing.findMany({
        where: { isDemo: true, status: ListingStatus.PUBLISHED },
        select: { id: true, publishedAt: true },
        orderBy: { id: 'asc' },
        take: LISTING_COUNT + SALE_LISTING_COUNT,
    });
    const run: ActivityRun = { roll: random(20261114), tenantIds, today, viewRows: [], saveRows: new Map() };
    const historyStart = new Date(today.getTime() - (HISTORY_DAYS - 1) * DAY_MS);
    listings.forEach((listing, listingIndex) => {
        addListingActivity(run, listing, listingIndex, historyStart);
    });
    return insertActivity(prisma, run.viewRows, [...run.saveRows.values()]);
};
