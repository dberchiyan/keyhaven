import { MINUTES_PER_HOUR, MS_PER_SECOND } from '@/common/time/units';
import { addUtcDays, toUtcDay } from '@/common/time/utc-day';

const EPOCH_YEAR = 1970;
const FIRST_MONTH = 1;
const FIRST_DAY = 1;

interface LocalParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

/**
 * Local time in a city's IANA zone without a date library (CORE-12): the owner writes hours as
 * local minutes of a weekday; a slot is the UTC instant those minutes start on a given local day.
 * `Intl` knows the zone rules; nothing here guesses an offset. One clock holds one formatter, so a
 * caller computing many slots of one zone builds it once (no module-level cache).
 */
export class ZonedClock {
    private readonly formatter: Intl.DateTimeFormat;

    constructor(timeZone: string) {
        this.formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    /**
     * The zone's offset from UTC at that instant, in milliseconds (positive east of Greenwich);
     * whole seconds, as the formatter drops the milliseconds.
     */
    offsetMs(instant: Date): number {
        const local = this.partsOf(instant);
        const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
        return asUtc - Math.floor(instant.getTime() / MS_PER_SECOND) * MS_PER_SECOND;
    }

    /**
     * The instant at which a local day's minute starts in the zone. Two passes settle the offset
     * across a DST change; inside a spring-forward gap the clock's later reading wins.
     */
    instant(day: string, minute: number): Date {
        const [year, month, date] = dayParts(day);
        const guess = Date.UTC(year, month - 1, date, 0, minute);
        const first = guess - this.offsetMs(new Date(guess));
        return new Date(guess - this.offsetMs(new Date(first)));
    }

    /** The local calendar day of an instant in the zone, `YYYY-MM-DD`. */
    day(instant: Date): string {
        const local = this.partsOf(instant);
        return `${local.year}-${twoDigits(local.month)}-${twoDigits(local.day)}`;
    }

    /** Minutes since the local midnight of the instant's own local day. */
    minute(instant: Date): number {
        const local = this.partsOf(instant);
        return local.hour * MINUTES_PER_HOUR + local.minute;
    }

    private partsOf(instant: Date): LocalParts {
        const parts = new Map<string, number>();
        for (const part of this.formatter.formatToParts(instant)) {
            if (part.type !== 'literal') {
                parts.set(part.type, Number(part.value));
            }
        }
        return {
            year: parts.get('year') ?? EPOCH_YEAR,
            month: parts.get('month') ?? FIRST_MONTH,
            day: parts.get('day') ?? FIRST_DAY,
            hour: parts.get('hour') ?? 0,
            minute: parts.get('minute') ?? 0,
            second: parts.get('second') ?? 0,
        };
    }
}

const dayParts = (day: string): [number, number, number] => {
    const [year = EPOCH_YEAR, month = FIRST_MONTH, date = FIRST_DAY] = day.split('-').map(Number);
    return [year, month, date];
};

const twoDigits = (value: number): string => String(value).padStart(2, '0');

/** One-off: the instant a local day's minute starts in the zone; repeated work uses a `ZonedClock`. */
export const zonedInstant = (timeZone: string, day: string, minute: number): Date =>
    new ZonedClock(timeZone).instant(day, minute);

/** One-off: the local calendar day of an instant in the zone. */
export const zonedDay = (timeZone: string, instant: Date): string => new ZonedClock(timeZone).day(instant);

/** One-off: minutes since the local midnight of the instant's own local day. */
export const zonedMinute = (timeZone: string, instant: Date): number => new ZonedClock(timeZone).minute(instant);

/** Sunday = 0 … Saturday = 6 of a `YYYY-MM-DD` day; noon avoids any day-boundary doubt. */
export const weekdayOf = (day: string): number => new Date(`${day}T12:00:00Z`).getUTCDay();

/** `days` after a `YYYY-MM-DD` day (negative goes back), in whole UTC days (DATA-21). */
export const addDays = (day: string, days: number): string => toUtcDay(addUtcDays(new Date(`${day}T00:00:00Z`), days));
