import { DAY_MS, ISO_DAY_LENGTH } from './units';

/**
 * UTC calendar day of an instant, `YYYY-MM-DD`: days are counted in UTC everywhere (QRY-22), so a
 * time never lands on another day.
 */
export const utcDayOf = (instant: Date): string => instant.toISOString().slice(0, ISO_DAY_LENGTH);

/** Today in UTC (QRY-22), `YYYY-MM-DD`. */
export const todayUtcIso = (): string => utcDayOf(new Date());

/** The day before a `YYYY-MM-DD` day, counted in UTC so a daylight-saving switch cannot skip one. */
export const previousDay = (day: string): string => utcDayOf(new Date(new Date(`${day}T00:00:00Z`).getTime() - DAY_MS));
