import type { PrismaClient } from '@/generated/prisma/client';
import { addDays, zonedDay } from '@/modules/viewing/service/zoned-time';

import { pick } from './seed-random';

const CREATE_MANY_BATCH_SIZE = 500;
const SCHEDULED_SHARE = 0.85;

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

export const HOUR_PATTERNS = [
    {
        slot: 30,
        notice: 12,
        horizon: 21,
        weekdays: [[17 * 60, 19 * 60]],
        weekend: [[10 * 60, 13 * 60]],
    },
    {
        slot: 20,
        notice: 4,
        horizon: 14,
        weekdays: [[12 * 60, 14 * 60]],
        weekend: [[11 * 60, 16 * 60]],
    },
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
    { slot: 45, notice: 24, horizon: 7, weekdays: [[8 * 60, 11 * 60]], weekend: [] },
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

export interface ScheduledHome {
    pattern: (typeof HOUR_PATTERNS)[number];
    timeZone: string;
    landlordId: string | null;
}

export interface SeedHome {
    id: string;
    landlordId: string | null;
    agencyId: string | null;
    city: { timeZone: string };
}

/** An agency keeps long days; other owners pick a pattern; one home in three has a day off ahead. */
const scheduleRowOf = (
    roll: () => number,
    listing: SeedHome,
    now: Date,
): { row: ScheduleRow; pattern: ScheduledHome['pattern'] } => {
    const pattern = listing.agencyId ? HOUR_PATTERNS[2] : pick(HOUR_PATTERNS, roll());
    const windows = [
        ...WEEKDAYS.flatMap((weekday) => pattern.weekdays.map(([start, end]) => ({ weekday, start, end }))),
        ...WEEKEND.flatMap((weekday) => pattern.weekend.map(([start, end]) => ({ weekday, start, end }))),
    ];
    const today = zonedDay(listing.city.timeZone, now);
    const blockedDays = roll() < 0.3 ? [addDays(today, 3 + Math.floor(roll() * 10))] : [];
    const row = {
        listingId: listing.id,
        slotMinutes: pattern.slot,
        noticeHours: pattern.notice,
        horizonDays: pattern.horizon,
        windows,
        blockedDays,
    };
    return { row, pattern };
};

/**
 * Viewing hours on most published showcase homes, so a tenant can book almost anywhere: weekday evenings with Saturday
 * mornings, lunch breaks with both weekend days, an agency's long days, mornings only a week ahead, and evenings all
 * week (windows in local minutes). Idempotent by the listing's unique — a second run adds nothing.
 */
export const seedSchedules = async (
    prisma: PrismaClient,
    roll: () => number,
    listings: readonly SeedHome[],
    now: Date,
): Promise<{ schedules: number; scheduled: Map<string, ScheduledHome> }> => {
    const scheduleRows: ScheduleRow[] = [];
    const scheduled = new Map<string, ScheduledHome>();
    for (const listing of listings) {
        if (roll() > SCHEDULED_SHARE) {
            continue;
        }
        const { row, pattern } = scheduleRowOf(roll, listing, now);
        scheduleRows.push(row);
        scheduled.set(listing.id, {
            pattern,
            timeZone: listing.city.timeZone,
            landlordId: listing.landlordId,
        });
    }
    let schedules = 0;
    for (let start = 0; start < scheduleRows.length; start += CREATE_MANY_BATCH_SIZE) {
        const created = await prisma.viewingSchedule.createMany({
            data: scheduleRows.slice(start, start + CREATE_MANY_BATCH_SIZE),
            skipDuplicates: true,
        });
        schedules += created.count;
    }
    return { schedules, scheduled };
};
