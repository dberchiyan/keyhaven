import { createHash } from 'node:crypto';
import type { PrismaClient } from '../src/generated/prisma/client';
import { ListingStatus } from '../src/modules/listing/service/listing-status';
import { LISTING_COUNT, SALE_LISTING_COUNT } from './seed-listings';

/**
 * Views and saves of the showcase listings over the last months, so the owners' insights have
 * something to show on day one: each published home draws its own daily interest (more right
 * after publishing and at weekends), most visits come from anonymous visitors, some from the
 * seeded renters, and a share of the visits ends in a save. Every row is deterministic and
 * carries a unique key (visitor + day, person + day, person + home), so a re-run adds nothing.
 */
const HISTORY_DAYS = 180;
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
    // How much this home pulls per day, on its own.
    const interest = 0.25 + roll() * 2;
    const publishedOn = utcDay(listing.publishedAt ?? today);
    const firstDay = publishedOn > historyStart ? publishedOn : historyStart;
    for (let day = firstDay, dayIndex = 0; day <= today; day = new Date(day.getTime() + DAY_MS)) {
      dayIndex += 1;
      const age = Math.round((day.getTime() - publishedOn.getTime()) / DAY_MS);
      const weekday = day.getUTCDay();
      const expected =
        interest *
        (weekday === 0 || weekday === 6 ? 1.25 : 1) *
        (age < 10 ? 1.8 : age < 30 ? 1.1 : 0.85) *
        // Today is still young when the seed runs.
        (day.getTime() === today.getTime() ? 0.35 : 1);
      const count = Math.floor(expected * (0.4 + roll() * 1.2));
      const dayIso = day.toISOString().slice(0, 10);
      for (let visit = 0; visit < count; visit += 1) {
        const createdAt = new Date(day.getTime() + Math.floor((6 + roll() * 16) * 60) * 60_000);
        const byRenter = roll() < RENTER_SHARE;
        // Distinct renters within a day (the per-day unique on person + home).
        const renterId = at(tenantIds, listingIndex * 7 + dayIndex * 3 + visit);
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
    }
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
