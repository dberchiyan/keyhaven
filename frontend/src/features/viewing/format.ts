import { DAY_MS, DAYS_PER_WEEK, ISO_DAY_LENGTH, MINUTE_MS, MINUTES_PER_HOUR } from '@/shared/lib/units';

import type { Viewing, ViewingStatus } from './types';

const TIME_DIGITS = 2;
const REFERENCE_SUNDAY_MS = new Date('2023-01-01T00:00:00Z').getTime();

export const SUNDAY = 0;
export const SATURDAY = DAYS_PER_WEEK - 1;
export const WEEK_DAYS: readonly number[] = Array.from({ length: DAYS_PER_WEEK }, (_, weekday) => weekday);
export const WEEKDAY_ORDER: readonly number[] = [...WEEK_DAYS.slice(1), SUNDAY];

export type DisplayStatus = ViewingStatus | 'HELD';

/** "5:30 PM" in the home's zone: a viewing happens where the home is, never in the reader's zone. */
export const formatSlotTime = (iso: string, timeZone: string, locale: string): string =>
    new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/** "Tue, Nov 18" in the home's zone, so the date matches the time beside it. */
export const formatSlotDate = (iso: string, timeZone: string, locale: string): string =>
    new Intl.DateTimeFormat(locale, {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    }).format(new Date(iso));

/** "Tue, Nov 18, 5:30 PM" in the home's zone, so the date matches the time beside it. */
export const formatSlot = (iso: string, timeZone: string, locale: string): string =>
    new Intl.DateTimeFormat(locale, {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(iso));

/** A `YYYY-MM-DD` local day read at noon UTC, so no zone can move it to a neighbouring day. */
const middayOf = (day: string): Date => new Date(`${day}T12:00:00Z`);

/** "Tuesday, November 18" of a local calendar day — formatted in UTC so no zone shifts it. */
export const formatDayHeading = (day: string, locale: string): string =>
    new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    }).format(middayOf(day));

/** "Tue" and "18" apart, because the day strip shows the weekday as a column heading. */
export const formatDayChip = (day: string, locale: string): { weekday: string; day: string } => {
    const instant = middayOf(day);
    return {
        weekday: new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' }).format(instant),
        day: new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric' }).format(instant),
    };
};

/** "CST" / "Central Standard Time" as the zone is called today — daylight saving changes the name. */
export const zoneName = (timeZone: string, locale: string, style: 'short' | 'long' = 'short'): string =>
    new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value ?? timeZone;

/** Minutes of a local day as "5:30 PM" — formatted as a UTC time, so no zone shifts the hours. */
export const formatMinutes = (minutes: number, locale: string): string =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).format(
        new Date(minutes * MINUTE_MS),
    );

/** Minutes of a local day as an `<input type="time">` value, the API keeping hours as minutes. */
export const minutesToTime = (minutes: number): string =>
    `${String(Math.floor(minutes / MINUTES_PER_HOUR)).padStart(TIME_DIGITS, '0')}:${String(
        minutes % MINUTES_PER_HOUR,
    ).padStart(TIME_DIGITS, '0')}`;

/** An `<input type="time">` value back into minutes of the day, as the API keeps hours. */
export const timeToMinutes = (time: string): number => {
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    return hours * MINUTES_PER_HOUR + minutes;
};

/** "Mon" / "Monday" for the API's weekday (Sunday = 0), counted from a known Sunday so Intl names it. */
export const weekdayName = (weekday: number, locale: string, style: 'short' | 'long'): string =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: style }).format(
        new Date(REFERENCE_SUNDAY_MS + weekday * DAY_MS),
    );

/** A confirmed viewing whose time passed "took place": the API keeps it CONFIRMED, people read it as held. */
export const displayStatus = (viewing: Pick<Viewing, 'status' | 'endsAt'>, now: number): DisplayStatus =>
    viewing.status === 'CONFIRMED' && new Date(viewing.endsAt).getTime() < now ? 'HELD' : viewing.status;

/** Ahead and still live: only these can still be answered or called off. */
export const isUpcoming = (viewing: Pick<Viewing, 'status' | 'startsAt'>, now: number): boolean =>
    (viewing.status === 'REQUESTED' || viewing.status === 'CONFIRMED') && new Date(viewing.startsAt).getTime() > now;

/** The home's local calendar day of an instant, `YYYY-MM-DD` — the agenda groups by the home's day. */
export const zonedDayOf = (iso: string, timeZone: string): string =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
        .format(new Date(iso))
        .slice(0, ISO_DAY_LENGTH);

/** "Today", "Tomorrow", "Yesterday" in the home's zone; undefined further away, where the date says it. */
export const relativeDayName = (day: string, timeZone: string, now: number, locale: string): string | undefined => {
    const offset = [-1, 0, 1].find(
        (candidate) => zonedDayOf(new Date(now + candidate * DAY_MS).toISOString(), timeZone) === day,
    );
    return offset === undefined
        ? undefined
        : new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(offset, 'day');
};
