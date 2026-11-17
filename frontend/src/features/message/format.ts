import type { Message } from './types';

/** Messages this close from the same person read as one run: a name once, a time at the end. */
const RUN_GAP_MS = 5 * 60_000;

/**
 * Chat times are the reader's own clock (not the home's zone, not UTC): a message was written
 * "at 5:30 PM" in the sense the reader lives in — the viewing itself is shown in the home's zone.
 */
export const formatMessageTime = (iso: string, locale: string): string =>
    new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/** The reader's local calendar day of an instant, `YYYY-MM-DD`. */
const localDay = (instant: Date): string =>
    `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, '0')}-${String(instant.getDate()).padStart(2, '0')}`;

/** "Today", "Yesterday", or "Tue, Nov 18" (with the year when it is not this one). */
export const formatDayDivider = (iso: string, now: number, locale: string): string => {
    const instant = new Date(iso);
    const today = new Date(now);
    const yesterday = new Date(now - 86_400_000);
    const day = localDay(instant);
    if (day === localDay(today) || day === localDay(yesterday)) {
        return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(day === localDay(today) ? 0 : -1, 'day');
    }
    return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...(instant.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
    }).format(instant);
};

/** Where a message sits in a run of the same sender: the corners and the time follow it. */
export type RunPosition = 'single' | 'first' | 'middle' | 'last';

export interface PlacedMessage {
    message: Message;
    position: RunPosition;
}

export interface DayGroup {
    day: string;
    messages: PlacedMessage[];
}

/**
 * Messages in order, split into runs of one local day, each message placed in its run (the same
 * sender, within a few minutes of the previous one).
 */
export const groupByDay = (messages: readonly Message[]): DayGroup[] => {
    const groups: DayGroup[] = [];
    for (const [index, message] of messages.entries()) {
        const day = localDay(new Date(message.createdAt));
        const previous = messages[index - 1];
        const next = messages[index + 1];
        const joinsPrevious =
            previous !== undefined &&
            previous.sender.id === message.sender.id &&
            localDay(new Date(previous.createdAt)) === day &&
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() <= RUN_GAP_MS;
        const joinsNext =
            next !== undefined &&
            next.sender.id === message.sender.id &&
            localDay(new Date(next.createdAt)) === day &&
            new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime() <= RUN_GAP_MS;
        const position: RunPosition = joinsPrevious ? (joinsNext ? 'middle' : 'last') : joinsNext ? 'first' : 'single';
        const last = groups[groups.length - 1];
        if (last && last.day === day) {
            last.messages.push({ message, position });
        } else {
            groups.push({ day, messages: [{ message, position }] });
        }
    }
    return groups;
};

/** The inbox row's time: the clock today, the weekday this week, else the date. */
export const formatInboxTime = (iso: string, now: number, locale: string): string => {
    const instant = new Date(iso);
    const elapsed = now - instant.getTime();
    if (localDay(instant) === localDay(new Date(now))) {
        return formatMessageTime(iso, locale);
    }
    if (elapsed < 6 * 86_400_000) {
        return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(instant);
    }
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(instant);
};
