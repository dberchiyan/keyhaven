import type { Viewing, ViewingStatus } from './types';

/** "5:30 PM" in the home's zone. */
export const formatSlotTime = (iso: string, timeZone: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  );

/** "Tue, Nov 18" in the home's zone. */
export const formatSlotDate = (iso: string, timeZone: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));

/** "Tue, Nov 18, 5:30 PM" in the home's zone. */
export const formatSlot = (iso: string, timeZone: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));

/** "Tuesday, November 18" of a `YYYY-MM-DD` local day (a calendar day, no zone shift). */
export const formatDayHeading = (day: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${day}T12:00:00Z`));

/** "Tue 18" for the day strip. */
export const formatDayChip = (day: string, locale: string): { weekday: string; day: string } => {
  const instant = new Date(`${day}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' }).format(instant),
    day: new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric' }).format(instant),
  };
};

/** "CST" / "Central Standard Time": what the zone is called right now. */
export const zoneName = (
  timeZone: string,
  locale: string,
  style: 'short' | 'long' = 'short',
): string =>
  new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value ?? timeZone;

/** Minutes of a local day as "5:30 PM" (formatted as a UTC time, so no zone shifts it). */
export const formatMinutes = (minutes: number, locale: string): string =>
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).format(
    new Date(minutes * 60_000),
  );

/** Minutes ↔ the value of an `<input type="time">`. */
export const minutesToTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export const timeToMinutes = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Monday first (a US calendar still reads better for hours), Sunday = 0 as the API has it. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** "Mon" / "Monday": 2023-01-01 was a Sunday, so day + weekday lands on the right name. */
export const weekdayName = (weekday: number, locale: string, style: 'short' | 'long'): string =>
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: style }).format(
    new Date(Date.UTC(2023, 0, 1 + weekday)),
  );

/** What the viewing is now: a confirmed one whose time passed "took place". */
export type DisplayStatus = ViewingStatus | 'HELD';
export const displayStatus = (
  viewing: Pick<Viewing, 'status' | 'endsAt'>,
  now: number,
): DisplayStatus =>
  viewing.status === 'CONFIRMED' && new Date(viewing.endsAt).getTime() < now
    ? 'HELD'
    : viewing.status;

/** Ahead and still live: the viewings a tenant or an owner can still act on. */
export const isUpcoming = (viewing: Pick<Viewing, 'status' | 'startsAt'>, now: number): boolean =>
  (viewing.status === 'REQUESTED' || viewing.status === 'CONFIRMED') &&
  new Date(viewing.startsAt).getTime() > now;
