import { DAY_MS, HOUR_MS, MINUTE_MS, WEEK_MS } from './units';

const relativeFormat = (locale: string): Intl.RelativeTimeFormat =>
    new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

/**
 * "5 minutes ago", "yesterday", "3 days ago"; a UTC date after a week (QRY-22, I18N-4). Undefined
 * under a minute, so the caller words "just now" itself.
 */
export const formatAgo = (iso: string, now: number, locale: string): string | undefined => {
    const elapsed = Math.max(0, now - new Date(iso).getTime());
    if (elapsed < MINUTE_MS) {
        return undefined;
    }
    const relative = relativeFormat(locale);
    if (elapsed < HOUR_MS) {
        return relative.format(-Math.floor(elapsed / MINUTE_MS), 'minute');
    }
    if (elapsed < DAY_MS) {
        return relative.format(-Math.floor(elapsed / HOUR_MS), 'hour');
    }
    if (elapsed < WEEK_MS) {
        return relative.format(-Math.floor(elapsed / DAY_MS), 'day');
    }
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));
};

/**
 * "Today", "Tomorrow", "Yesterday" for a calendar day a whole number of days from today (I18N-4); which day is
 * "today" (UTC, the home's zone, the reader's clock) is the caller's decision.
 */
export const formatRelativeDay = (offsetDays: number, locale: string): string =>
    relativeFormat(locale).format(offsetDays, 'day');
