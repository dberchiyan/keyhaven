/**
 * Local time in a city's IANA zone without a date library (architecture.md → Not used): the
 * owner writes hours as local minutes of a weekday; a slot is the UTC instant those minutes
 * start on a given local day. `Intl` knows the zone rules; nothing here guesses an offset.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

const partsFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const localPartsOf = (timeZone: string, instant: Date): LocalParts => {
  const parts: Partial<Record<string, number>> = {};
  for (const part of partsFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') {
      parts[part.type] = Number(part.value);
    }
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  };
};

/** The zone's offset from UTC at that instant, in milliseconds (positive east of Greenwich). */
export const zoneOffsetMs = (timeZone: string, instant: Date): number => {
  const local = localPartsOf(timeZone, instant);
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );
  // Whole minutes: the formatter drops the milliseconds.
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
};

const dayParts = (day: string): [number, number, number] => {
  const [year = 1970, month = 1, date = 1] = day.split('-').map(Number);
  return [year, month, date];
};

/**
 * The instant at which a local day's minute starts in the zone. Two passes settle the offset
 * across a DST change; inside a spring-forward gap the clock's later reading wins.
 */
export const zonedInstant = (timeZone: string, day: string, minute: number): Date => {
  const [year, month, date] = dayParts(day);
  const guess = Date.UTC(year, month - 1, date, 0, minute);
  const first = guess - zoneOffsetMs(timeZone, new Date(guess));
  const settled = guess - zoneOffsetMs(timeZone, new Date(first));
  return new Date(settled);
};

const twoDigits = (value: number): string => String(value).padStart(2, '0');

/** The local calendar day of an instant in the zone, `YYYY-MM-DD`. */
export const zonedDay = (timeZone: string, instant: Date): string => {
  const local = localPartsOf(timeZone, instant);
  return `${local.year}-${twoDigits(local.month)}-${twoDigits(local.day)}`;
};

/** Minutes since the local midnight of the instant's own local day. */
export const zonedMinute = (timeZone: string, instant: Date): number => {
  const local = localPartsOf(timeZone, instant);
  return local.hour * 60 + local.minute;
};

/** Sunday = 0 … Saturday = 6 of a `YYYY-MM-DD` day (noon avoids any day-boundary doubt). */
export const weekdayOf = (day: string): number => new Date(`${day}T12:00:00Z`).getUTCDay();

/** `days` after a `YYYY-MM-DD` day (negative goes back). */
export const addDays = (day: string, days: number): string =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);

/** Whole minutes between two instants (the later first). */
export const minutesBetween = (later: Date, earlier: Date): number =>
  Math.round((later.getTime() - earlier.getTime()) / MINUTE_MS);
