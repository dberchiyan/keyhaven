import { createHash } from 'node:crypto';
import type { PrismaClient } from '../src/generated/prisma/client';
import { ListingStatus } from '../src/modules/listing/service/listing-status';
import { LISTING_COUNT, SALE_LISTING_COUNT } from './seed-listings';

/**
 * Views and saves of the showcase listings over the last months, so the owners' insights have
 * something to show on day one: each published home draws a random total of views (never under
 * `MIN_VIEWS`, a long tail above), spread over its days on the site with more right after
 * publishing and at weekends; most visits come from anonymous visitors, some from the seeded
 * renters, and a share of the visits ends in a save. Every row is deterministic and carries a
 * unique key (visitor + day, person + day, person + home), so a re-run adds nothing.
 */
const HISTORY_DAYS = 180;
/** Every showcase home has at least this many views (user decision, 2026-11-15); the spread above it. */
const MIN_VIEWS = 250;
const VIEWS_SPREAD = 1250;
const DAY_MS = 86_400_000;
/** Rows per createMany statement. */
const BATCH = 1000;
/** A visit by a signed-in renter rather than a visitor; a visit that ends in a save. */
const RENTER_SHARE = 0.15;
const SAVE_SHARE = 0.07;

/** The same PRNG as the listings seed (mulberry32), its own stream. */
const random = (seed: number): (() => number) => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const at = <T>(items: readonly T[], index: number): T => {
    const item = items[index % items.length];
    if (item === undefined) {
        throw new Error('pick from an empty list');
    }
    return item;
};

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

export const seedActivity = async (
    prisma: PrismaClient,
    tenantIds: readonly string[],
    today: Date,
): Promise<{ views: number; saves: number }> => {
    const listings = await prisma.listing.findMany({
        where: { isDemo: true, status: ListingStatus.PUBLISHED },
        select: { id: true, publishedAt: true },
        orderBy: { id: 'asc' },
        // Bounded by the seed's own catalogue.
        take: LISTING_COUNT + SALE_LISTING_COUNT,
    });
    const roll = random(20261114);
    const viewRows: ViewRow[] = [];
    const saveRows = new Map<string, SaveRow>();
    const historyStart = new Date(today.getTime() - (HISTORY_DAYS - 1) * DAY_MS);

    listings.forEach((listing, listingIndex) => {
        // The home's total: squaring skews most homes towards the minimum, a few far above it.
        const target = MIN_VIEWS + Math.floor(roll() ** 2 * VIEWS_SPREAD);
        const publishedOn = utcDay(listing.publishedAt ?? today);
        const firstDay = publishedOn > historyStart ? publishedOn : historyStart;
        // Each day's share of the total: fresh, weekend and a dash of noise; today is still young.
        const days: { day: Date; weight: number }[] = [];
        for (let day = firstDay; day <= today; day = new Date(day.getTime() + DAY_MS)) {
            const age = Math.round((day.getTime() - publishedOn.getTime()) / DAY_MS);
            const weekday = day.getUTCDay();
            const weight =
                (weekday === 0 || weekday === 6 ? 1.25 : 1) *
                (age < 10 ? 1.8 : age < 30 ? 1.1 : 0.85) *
                (day.getTime() === today.getTime() ? 0.35 : 1) *
                (0.4 + roll() * 1.2);
            days.push({ day, weight });
        }
        const totalWeight = days.reduce((sum, entry) => sum + entry.weight, 0);
        let cumulativeWeight = 0;
        let allocated = 0;
        days.forEach(({ day, weight }, dayIndex) => {
            // Cumulative rounding: the day counts add up to the target exactly.
            cumulativeWeight += weight;
            const count = Math.round((target * cumulativeWeight) / totalWeight) - allocated;
            allocated += count;
            const dayIso = day.toISOString().slice(0, 10);
            let renters = 0;
            for (let visit = 0; visit < count; visit += 1) {
                const createdAt = new Date(day.getTime() + Math.floor((6 + roll() * 16) * 60) * 60_000);
                // Distinct renters within a day (the per-day unique on person + home): once every seeded
                // renter has been here today, the rest are visitors, so the total stays what was drawn.
                const byRenter = roll() < RENTER_SHARE && renters < tenantIds.length;
                const renterId = at(tenantIds, listingIndex * 7 + dayIndex * 3 + renters);
                if (byRenter) {
                    renters += 1;
                }
                viewRows.push({
                    listingId: listing.id,
                    userId: byRenter ? renterId : null,
                    visitorKey: byRenter ? null : visitorKey(listing.id, dayIso, visit),
                    viewedOn: day,
                    createdAt,
                });
                if (roll() < SAVE_SHARE) {
                    const saverId = byRenter ? renterId : at(tenantIds, listingIndex * 5 + dayIndex + visit);
                    const key = `${saverId}:${listing.id}`;
                    if (!saveRows.has(key)) {
                        saveRows.set(key, { userId: saverId, listingId: listing.id, createdAt });
                    }
                }
            }
        });
    });

    let views = 0;
    for (let start = 0; start < viewRows.length; start += BATCH) {
        const created = await prisma.listingView.createMany({
            data: viewRows.slice(start, start + BATCH),
            skipDuplicates: true,
        });
        views += created.count;
    }
    let saves = 0;
    const saveList = [...saveRows.values()];
    for (let start = 0; start < saveList.length; start += BATCH) {
        const created = await prisma.savedListing.createMany({
            data: saveList.slice(start, start + BATCH),
            skipDuplicates: true,
        });
        saves += created.count;
    }
    return { views, saves };
};
