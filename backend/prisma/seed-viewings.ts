import type { PrismaClient } from '@/generated/prisma/client';
import { ListingStatus } from '@/modules/listing/service/listing-status';
import { ViewingStatus } from '@/modules/viewing/service/viewing-status';
import { addDays, zonedDay, zonedInstant } from '@/modules/viewing/service/zoned-time';

import { LISTING_COUNT, SALE_LISTING_COUNT } from './seed-listings';
import { pick, random } from './seed-random';
import { type ScheduledHome, seedSchedules } from './seed-viewing-schedules';

const CREATE_MANY_BATCH_SIZE = 500;

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

interface PlannedViewing {
    listingId: string;
    tenantId: string;
    dayOffset: number;
    index: number;
    status: string;
    note?: string;
    cancelledBy?: string;
}

const MESSAGES = [
    'We are a couple with a small dog, looking to move in next month.',
    'Could we see the parking spot as well?',
    'Relocating for work; keen on a quick decision.',
    null,
    'Is the apartment available furnished?',
    null,
];

/** A slot is the `index`-th offered one of the day's first window, or none when the window is shorter. */
const slotOn = (
    entry: ScheduledHome | undefined,
    now: Date,
    dayOffset: number,
    index: number,
): { startsAt: Date; endsAt: Date } | null => {
    if (!entry) {
        return null;
    }
    const day = addDays(zonedDay(entry.timeZone, now), dayOffset);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    const window = (weekday === 0 || weekday === 6 ? entry.pattern.weekend : entry.pattern.weekdays)[0];
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

/** The showcase tenant's own four: a request waiting, one confirmed ahead, a declined one with a note, one past. */
const showcaseTenantPlan = (demoHomes: readonly string[], demoTenantId: string): PlannedViewing[] => {
    const [home1, home2, home3, home4] = demoHomes;
    if (!home1 || !home2 || !home3 || !home4) {
        return [];
    }
    return [
        { listingId: home1, tenantId: demoTenantId, dayOffset: 3, index: 1, status: ViewingStatus.REQUESTED },
        { listingId: home2, tenantId: demoTenantId, dayOffset: 5, index: 0, status: ViewingStatus.CONFIRMED },
        {
            listingId: home3,
            tenantId: demoTenantId,
            dayOffset: 2,
            index: 2,
            status: ViewingStatus.DECLINED,
            note: 'Already promised to another family for that evening — try the weekend.',
        },
        { listingId: home4, tenantId: demoTenantId, dayOffset: -6, index: 0, status: ViewingStatus.CONFIRMED },
    ];
};

/** The showcase landlord's dashboard: requests, confirmed ones ahead and past, a tenant's cancellation. */
const showcaseLandlordItem = (listingId: string, tenantId: string, position: number): PlannedViewing => {
    const base = { listingId, tenantId };
    switch (position % 4) {
        case 0:
            return { ...base, dayOffset: 1 + (position % 5), index: position % 3, status: ViewingStatus.REQUESTED };
        case 1:
            return { ...base, dayOffset: 2 + (position % 7), index: position % 2, status: ViewingStatus.CONFIRMED };
        case 2:
            return { ...base, dayOffset: -3 - (position % 9), index: 0, status: ViewingStatus.CONFIRMED };
        default:
            return {
                ...base,
                dayOffset: -2,
                index: 1,
                status: ViewingStatus.CANCELLED,
                cancelledBy: 'TENANT',
                note: 'Found a place closer to work.',
            };
    }
};

/** A sprinkle over the other owners' homes. */
const otherOwnerItem = (listingId: string, tenantId: string, position: number): PlannedViewing => {
    const base = { listingId, tenantId };
    switch (position % 3) {
        case 0:
            return { ...base, dayOffset: 1 + (position % 10), index: position % 3, status: ViewingStatus.REQUESTED };
        case 1:
            return { ...base, dayOffset: 2 + (position % 12), index: position % 2, status: ViewingStatus.CONFIRMED };
        default:
            return { ...base, dayOffset: -1 - (position % 20), index: 0, status: ViewingStatus.CONFIRMED };
    }
};

const planViewings = (
    scheduled: ReadonlyMap<string, ScheduledHome>,
    people: { demoTenantId: string; demoLandlordId: string; tenantIds: readonly string[] },
): PlannedViewing[] => {
    const demoHomes = [...scheduled.entries()]
        .filter(([, entry]) => entry.landlordId === people.demoLandlordId)
        .map(([id]) => id);
    const otherHomes = [...scheduled.keys()].filter((id) => !demoHomes.includes(id));
    const { demoTenantId, tenantIds } = people;
    return [
        ...showcaseTenantPlan(demoHomes, demoTenantId),
        ...demoHomes
            .slice(4, 16)
            .map((listingId, position) =>
                showcaseLandlordItem(listingId, tenantIds[position % tenantIds.length] ?? demoTenantId, position),
            ),
        ...otherHomes
            .slice(0, 120)
            .map((listingId, position) =>
                otherOwnerItem(listingId, tenantIds[(position * 7) % tenantIds.length] ?? demoTenantId, position),
            ),
    ];
};

const viewingRowsOf = (
    roll: () => number,
    plan: readonly PlannedViewing[],
    scheduled: ReadonlyMap<string, ScheduledHome>,
    now: Date,
): ViewingRow[] =>
    plan.flatMap((item) => {
        const slot = slotOn(scheduled.get(item.listingId), now, item.dayOffset, item.index);
        if (!slot) {
            return [];
        }
        const createdAt = new Date(slot.startsAt.getTime() - (2 + Math.floor(roll() * 5)) * 86_400_000);
        const decided = item.status === ViewingStatus.REQUESTED ? null : new Date(createdAt.getTime() + 3 * 3_600_000);
        return [
            {
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
            },
        ];
    });

/**
 * Hours on most published showcase homes and a handful of viewings for the showcase tenant and the other renters:
 * the showcase landlord's homes get the interesting ones (their dashboard). The catalogue read is bounded by the
 * seed's own size. Idempotent: hours by the listing's id, viewings by their unique keys — a second run adds nothing.
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
        take: LISTING_COUNT + SALE_LISTING_COUNT,
    });
    const roll = random(20261115);
    const { schedules, scheduled } = await seedSchedules(prisma, roll, listings, now);
    const plan = planViewings(scheduled, { demoTenantId, demoLandlordId, tenantIds });
    const rows = viewingRowsOf(roll, plan, scheduled, now);
    let viewings = 0;
    for (let start = 0; start < rows.length; start += CREATE_MANY_BATCH_SIZE) {
        const created = await prisma.viewing.createMany({
            data: rows.slice(start, start + CREATE_MANY_BATCH_SIZE),
            skipDuplicates: true,
        });
        viewings += created.count;
    }
    return { schedules, viewings };
};
