import { MS_PER_HOUR, MS_PER_MINUTE } from '@/common/time/units';

import type { BookableListingRecord } from '../repository/record/viewing.record';
import type { ViewingSlot, ViewingSlotDay } from './viewing.types';
import { type ViewingScheduleDocument, ViewingScheduleSchema, type ViewingWindow } from './viewing-schedule';
import { addDays, weekdayOf, type ZonedClock } from './zoned-time';

/** DATA-22: the stored hours are parsed on read as on write; a document that no longer parses reads as no hours. */
export const scheduleOf = (listing: BookableListingRecord): ViewingScheduleDocument | undefined => {
    if (!listing.viewingSchedule) {
        return undefined;
    }
    const parsed = ViewingScheduleSchema.safeParse(listing.viewingSchedule);
    return parsed.success ? parsed.data : undefined;
};

const earliestStart = (schedule: ViewingScheduleDocument, now: Date): Date =>
    new Date(now.getTime() + schedule.noticeHours * MS_PER_HOUR);

const windowSlots = (
    clock: ZonedClock,
    slotMinutes: number,
    day: string,
    window: ViewingWindow,
    earliest: Date,
): ViewingSlot[] => {
    const slots: ViewingSlot[] = [];
    for (let minute = window.start; minute + slotMinutes <= window.end; minute += slotMinutes) {
        const startsAt = clock.instant(day, minute);
        if (startsAt.getTime() >= earliest.getTime()) {
            slots.push({ startsAt, endsAt: new Date(startsAt.getTime() + slotMinutes * MS_PER_MINUTE) });
        }
    }
    return slots;
};

/** The slots of one local day: each window stepped by the slot length, from the earliest allowed. */
const slotsOfDay = (
    clock: ZonedClock,
    schedule: ViewingScheduleDocument,
    day: string,
    earliest: Date,
): ViewingSlot[] => {
    if (schedule.blockedDays.includes(day)) {
        return [];
    }
    const weekday = weekdayOf(day);
    return schedule.windows
        .filter((window) => window.weekday === weekday)
        .flatMap((window) => windowSlots(clock, schedule.slotMinutes, day, window, earliest))
        .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
};

/** Up to `maxDays` local days from `start` within the horizon, each with the slots the hours offer. */
export const offeredDays = (
    clock: ZonedClock,
    schedule: ViewingScheduleDocument,
    range: { start: string; horizonEndsOn: string; maxDays: number },
    now: Date,
): ViewingSlotDay[] => {
    const earliest = earliestStart(schedule, now);
    const days: ViewingSlotDay[] = [];
    for (let day = range.start; days.length < range.maxDays && day <= range.horizonEndsOn; day = addDays(day, 1)) {
        days.push({ day, slots: slotsOfDay(clock, schedule, day, earliest) });
    }
    return days;
};

/**
 * Is this instant one of the slots the hours offer right now (notice, horizon, windows, days off)?
 * Whole minutes only — the slot grid steps from a window's start.
 */
export const isOfferedSlot = (
    clock: ZonedClock,
    schedule: ViewingScheduleDocument,
    startsAt: Date,
    now: Date,
): boolean => {
    if (startsAt.getTime() < earliestStart(schedule, now).getTime() || startsAt.getTime() % MS_PER_MINUTE !== 0) {
        return false;
    }
    const day = clock.day(startsAt);
    if (day > addDays(clock.day(now), schedule.horizonDays) || schedule.blockedDays.includes(day)) {
        return false;
    }
    const minute = clock.minute(startsAt);
    const weekday = weekdayOf(day);
    return schedule.windows.some(
        (window) =>
            window.weekday === weekday &&
            minute >= window.start &&
            minute + schedule.slotMinutes <= window.end &&
            (minute - window.start) % schedule.slotMinutes === 0 &&
            clock.instant(day, minute).getTime() === startsAt.getTime(),
    );
};
