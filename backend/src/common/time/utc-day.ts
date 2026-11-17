import { MS_PER_DAY } from './units';

const ISO_DAY_LENGTH = '2000-01-01'.length;

/** DATA-21: a day is the UTC calendar day of the instant, never a local-time getter. */
export const toUtcDay = (instant: Date): string => instant.toISOString().slice(0, ISO_DAY_LENGTH);

/** DATA-21: whole UTC days, so no daylight-saving shift can move the result off midnight. */
export const addUtcDays = (instant: Date, days: number): Date => new Date(instant.getTime() + days * MS_PER_DAY);
