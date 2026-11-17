import type { PrismaClient } from '../src/generated/prisma/client';
import { ListingStatus } from '../src/modules/listing/service/listing-status';
import { ViewingStatus } from '../src/modules/viewing/service/viewing-status';
import { addDays, zonedDay, zonedInstant } from '../src/modules/viewing/service/zoned-time';
import { LISTING_COUNT, SALE_LISTING_COUNT } from './seed-listings';

/** Rows per createMany statement. */
const BATCH = 500;
/** Showcase homes with viewing hours: most, so a tenant can book almost anywhere. */
const SCHEDULED_SHARE = 0.85;

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

const pick = <T>(items: readonly T[], roll: number): T => {
    const item = items[Math.floor(roll * items.length) % items.length];
    if (item === undefined) {
        throw new Error('pick from an empty list');
    }
    return item;
};

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

/** A few believable patterns of hours; windows in local minutes. */
const HOUR_PATTERNS = [
    // Weekday evenings and Saturday mornings.
    {
        slot: 30,
        notice: 12,
        horizon: 21,
        weekdays: [[17 * 60, 19 * 60]],
        weekend: [[10 * 60, 13 * 60]],
    },
    // Lunch breaks and both weekend days.
    {
        slot: 20,
        notice: 4,
        horizon: 14,
        weekdays: [[12 * 60, 14 * 60]],
        weekend: [[11 * 60, 16 * 60]],
    },
    // An agency's long days.
    {
        slot: 30,
        notice: 2,
        horizon: 30,
        weekdays: [
            [9 * 60, 12 * 60],
            [14 * 60, 18 * 60],
        ],
        weekend: [[10 * 60, 14 * 60]],
    },
    // Mornings only, a week ahead at most.
    { slot: 45, notice: 24, horizon: 7, weekdays: [[8 * 60, 11 * 60]], weekend: [] },
    // Evenings all week.
    {
        slot: 15,
        notice: 6,
        horizon: 14,
        weekdays: [[18 * 60, 20 * 60]],
        weekend: [[17 * 60, 20 * 60]],
    },
] as const;

interface ScheduleRow {
    listingId: string;
    slotMinutes: number;
    noticeHours: number;
    horizonDays: number;
    windows: { weekday: number; start: number; end: number }[];
    blockedDays: string[];
}

interface ViewingRow {
    listingId: string;
    tenantId: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    message: string | null;
    note: string | null;
    cancelledBy: string | null;
    decidedAt: Date | null;
    createdAt: Date;
}

const MESSAGES = [
    'We are a couple with a small dog, looking to move in next month.',
    'Could we see the parking spot as well?',
    'Relocating for work; keen on a quick decision.',
    null,
    'Is the apartment available furnished?',
    null,
];

/**
 * Viewing hours on most published showcase homes (a few patterns, days off here and there) and
 * a handful of viewings for the showcase tenant and the other renters: a request waiting for
 * the showcase landlord, confirmed ones ahead, a declined one with a note, a few that already
 * took place. Idempotent: hours by the listing's id, viewings by their unique keys — a second
 * run adds nothing.
 */
export const seedViewings = async (
    prisma: PrismaClient,
    demoTenantId: string,
    demoLandlordId: string,
    tenantIds: readonly string[],
    now: Date,
): Promise<{ schedules: number; viewings: number }> => {
    const listings = await prisma.listing.findMany({
        where: { isDemo: true, status: ListingStatus.PUBLISHED },
        select: { id: true, landlordId: true, agencyId: true, city: { select: { timeZone: true } } },
        orderBy: { id: 'asc' },
        // Bounded by the seed's own catalogue.
        take: LISTING_COUNT + SALE_LISTING_COUNT,
    });
    const roll = random(20261115);
    const scheduleRows: ScheduleRow[] = [];
    const scheduled = new Map<
        string,
        { pattern: (typeof HOUR_PATTERNS)[number]; timeZone: string; landlordId: string | null }
    >();
    for (const listing of listings) {
        if (roll() > SCHEDULED_SHARE) {
            continue;
        }
        const pattern = listing.agencyId ? HOUR_PATTERNS[2] : pick(HOUR_PATTERNS, roll());
        const windows = [
            ...WEEKDAYS.flatMap((weekday) => pattern.weekdays.map(([start, end]) => ({ weekday, start, end }))),
            ...WEEKEND.flatMap((weekday) => pattern.weekend.map(([start, end]) => ({ weekday, start, end }))),
        ];
        const today = zonedDay(listing.city.timeZone, now);
        const blockedDays = roll() < 0.3 ? [addDays(today, 3 + Math.floor(roll() * 10))] : [];
        scheduleRows.push({
            listingId: listing.id,
            slotMinutes: pattern.slot,
            noticeHours: pattern.notice,
            horizonDays: pattern.horizon,
            windows,
            blockedDays,
        });
        scheduled.set(listing.id, {
            pattern,
            timeZone: listing.city.timeZone,
            landlordId: listing.landlordId,
        });
    }
    let schedules = 0;
    for (let start = 0; start < scheduleRows.length; start += BATCH) {
        const created = await prisma.viewingSchedule.createMany({
            data: scheduleRows.slice(start, start + BATCH),
            skipDuplicates: true,
        });
        schedules += created.count;
    }

    // Viewings: the showcase landlord's homes get the interesting ones (their dashboard), the rest
    // spread over other owners. A slot is the first offered one of a given day.
    const slotOn = (listingId: string, dayOffset: number, index: number): { startsAt: Date; endsAt: Date } | null => {
        const entry = scheduled.get(listingId);
        if (!entry) {
            return null;
        }
        const day = addDays(zonedDay(entry.timeZone, now), dayOffset);
        const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
        const windows = weekday === 0 || weekday === 6 ? entry.pattern.weekend : entry.pattern.weekdays;
        const window = windows[0];
        if (!window) {
            return null;
        }
        const minute = window[0] + index * entry.pattern.slot;
        if (minute + entry.pattern.slot > window[1]) {
            return null;
        }
        const startsAt = zonedInstant(entry.timeZone, day, minute);
        return { startsAt, endsAt: new Date(startsAt.getTime() + entry.pattern.slot * 60_000) };
    };

    const rows: ViewingRow[] = [];
    const demoHomes = [...scheduled.entries()]
        .filter(([, entry]) => entry.landlordId === demoLandlordId)
        .map(([id]) => id);
    const otherHomes = [...scheduled.keys()].filter((id) => !demoHomes.includes(id));
    const plan: {
        listingId: string;
        tenantId: string;
        dayOffset: number;
        index: number;
        status: string;
        note?: string;
        cancelledBy?: string;
    }[] = [];
    // The showcase tenant: a request waiting, a confirmed viewing ahead, a declined one, one held last week.
    const [home1, home2, home3, home4] = demoHomes;
    if (home1 && home2 && home3 && home4) {
        plan.push({
            listingId: home1,
            tenantId: demoTenantId,
            dayOffset: 3,
            index: 1,
            status: ViewingStatus.REQUESTED,
        });
        plan.push({
            listingId: home2,
            tenantId: demoTenantId,
            dayOffset: 5,
            index: 0,
            status: ViewingStatus.CONFIRMED,
        });
        plan.push({
            listingId: home3,
            tenantId: demoTenantId,
            dayOffset: 2,
            index: 2,
            status: ViewingStatus.DECLINED,
            note: 'Already promised to another family for that evening — try the weekend.',
        });
        plan.push({
            listingId: home4,
            tenantId: demoTenantId,
            dayOffset: -6,
            index: 0,
            status: ViewingStatus.CONFIRMED,
        });
    }
    // Other renters on the showcase landlord's homes: requests to answer, confirmed ones ahead, history.
    demoHomes.slice(4, 16).forEach((listingId, position) => {
        const tenantId = tenantIds[position % tenantIds.length] ?? demoTenantId;
        const kind = position % 4;
        plan.push(
            kind === 0
                ? {
                      listingId,
                      tenantId,
                      dayOffset: 1 + (position % 5),
                      index: position % 3,
                      status: ViewingStatus.REQUESTED,
                  }
                : kind === 1
                  ? {
                        listingId,
                        tenantId,
                        dayOffset: 2 + (position % 7),
                        index: position % 2,
                        status: ViewingStatus.CONFIRMED,
                    }
                  : kind === 2
                    ? {
                          listingId,
                          tenantId,
                          dayOffset: -3 - (position % 9),
                          index: 0,
                          status: ViewingStatus.CONFIRMED,
                      }
                    : {
                          listingId,
                          tenantId,
                          dayOffset: -2,
                          index: 1,
                          status: ViewingStatus.CANCELLED,
                          cancelledBy: 'TENANT',
                          note: 'Found a place closer to work.',
                      },
        );
    });
    // A sprinkle over the other owners' homes, so agents and other landlords have rows too.
    otherHomes.slice(0, 120).forEach((listingId, position) => {
        const tenantId = tenantIds[(position * 7) % tenantIds.length] ?? demoTenantId;
        const kind = position % 3;
        plan.push(
            kind === 0
                ? {
                      listingId,
                      tenantId,
                      dayOffset: 1 + (position % 10),
                      index: position % 3,
                      status: ViewingStatus.REQUESTED,
                  }
                : kind === 1
                  ? {
                        listingId,
                        tenantId,
                        dayOffset: 2 + (position % 12),
                        index: position % 2,
                        status: ViewingStatus.CONFIRMED,
                    }
                  : {
                        listingId,
                        tenantId,
                        dayOffset: -1 - (position % 20),
                        index: 0,
                        status: ViewingStatus.CONFIRMED,
                    },
        );
    });
    for (const item of plan) {
        const slot = slotOn(item.listingId, item.dayOffset, item.index);
        if (!slot) {
            continue;
        }
        const createdAt = new Date(slot.startsAt.getTime() - (2 + Math.floor(roll() * 5)) * 86_400_000);
        const decided = item.status === ViewingStatus.REQUESTED ? null : new Date(createdAt.getTime() + 3 * 3_600_000);
        rows.push({
            listingId: item.listingId,
            tenantId: item.tenantId,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            status: item.status,
            message: pick(MESSAGES, roll()),
            note: item.note ?? null,
            cancelledBy: item.cancelledBy ?? null,
            decidedAt: decided,
            createdAt,
        });
    }
    let viewings = 0;
    for (let start = 0; start < rows.length; start += BATCH) {
        const created = await prisma.viewing.createMany({
            data: rows.slice(start, start + BATCH),
            skipDuplicates: true,
        });
        viewings += created.count;
    }
    return { schedules, viewings };
};
