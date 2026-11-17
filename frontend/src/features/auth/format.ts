import { ISO_DAY_LENGTH, MINUTE_MS } from '@/shared/lib/units';

import type { SecurityCategory, SecurityEvent } from './types';

type Action = SecurityEvent['action'];

export const SECURITY_CATEGORIES = [
    'SIGN_INS',
    'FAILED',
    'PASSWORD',
    'SESSIONS',
] as const satisfies readonly SecurityCategory[];

export const isSecurityCategory = (value: unknown): value is SecurityCategory =>
    SECURITY_CATEGORIES.some((category) => category === value);

export type SecurityTone = 'normal' | 'danger' | 'critical';

export const SECURITY_TONES: Record<Action, SecurityTone> = {
    'auth.signed_in': 'normal',
    'auth.sign_in_failed': 'danger',
    'auth.signed_out': 'normal',
    'auth.email_verified': 'normal',
    'auth.password_changed': 'critical',
    'auth.password_reset': 'critical',
    'auth.session_ended': 'normal',
    'auth.other_sessions_ended': 'critical',
    'auth.session_evicted': 'normal',
    'auth.sign_in_locked': 'danger',
};

const GROUP_GAP_MINUTES = 30;
const GROUP_GAP_MS = GROUP_GAP_MINUTES * MINUTE_MS;

const kindOf = (action: Action): string =>
    action === 'auth.signed_in' || action === 'auth.signed_out' ? 'session' : action;

/** Critical events (a password change, other sessions ended) stand alone so they never hide in a group. */
const groupable = (action: Action): boolean => SECURITY_TONES[action] !== 'critical';

export interface SecurityEventGroup {
    id: string;
    events: [SecurityEvent, ...SecurityEvent[]];
}

export interface SecurityDay {
    day: string;
    groups: SecurityEventGroup[];
}

const dayOf = (iso: string): string => iso.slice(0, ISO_DAY_LENGTH);

const sameRow = (group: SecurityEventGroup, event: SecurityEvent): boolean => {
    const last = group.events[group.events.length - 1];
    if (!last || !groupable(last.action) || !groupable(event.action)) {
        return false;
    }
    return (
        kindOf(last.action) === kindOf(event.action) &&
        last.userAgent === event.userAgent &&
        last.ip === event.ip &&
        dayOf(last.occurredAt) === dayOf(event.occurredAt) &&
        new Date(last.occurredAt).getTime() - new Date(event.occurredAt).getTime() <= GROUP_GAP_MS
    );
};

/**
 * Newest-first events → days (UTC, QRY-22) → rows: a long log of the same sign-in from the same
 * browser and IP within half an hour reads as one row, so the unusual events stand out.
 */
export const groupSecurityEvents = (events: readonly SecurityEvent[]): SecurityDay[] => {
    const days: SecurityDay[] = [];
    for (const event of events) {
        const day = dayOf(event.occurredAt);
        let current = days[days.length - 1];
        if (current?.day !== day) {
            current = { day, groups: [] };
            days.push(current);
        }
        const group = current.groups[current.groups.length - 1];
        if (group && sameRow(group, event)) {
            group.events.push(event);
            continue;
        }
        current.groups.push({ id: event.id, events: [event] });
    }
    return days;
};

export interface DeviceSummary {
    browser: string | undefined;
    os: string | undefined;
    isMobile: boolean;
}

const BROWSERS: [RegExp, string][] = [
    [/Edg\//, 'Edge'],
    [/OPR\/|Opera/, 'Opera'],
    [/Firefox\//, 'Firefox'],
    [/Chrome\/|CriOS\//, 'Chrome'],
    [/Safari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
    [/iPhone|iPad|iPod/, 'iOS'],
    [/Android/, 'Android'],
    [/Mac OS X|Macintosh/, 'macOS'],
    [/Windows/, 'Windows'],
    [/CrOS/, 'ChromeOS'],
    [/Linux/, 'Linux'],
];

/**
 * Browser and system from a user-agent string, by a few patterns rather than a parser library —
 * the names only label a session row, so "unknown" is an acceptable miss (bundle budget, PERF-2).
 */
export const describeUserAgent = (userAgent: string | null): DeviceSummary => {
    const text = userAgent ?? '';
    return {
        browser: BROWSERS.find(([pattern]) => pattern.test(text))?.[1],
        os: SYSTEMS.find(([pattern]) => pattern.test(text))?.[1],
        isMobile: /Mobi|iPhone|Android/.test(text),
    };
};
