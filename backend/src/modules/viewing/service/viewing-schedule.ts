import { z } from 'zod';

import { DAYS_PER_WEEK, HOURS_PER_DAY, MINUTES_PER_DAY, MINUTES_PER_HOUR } from '@/common/time/units';

const QUARTER_HOUR_MINUTES = 15;
const TWENTY_MINUTES = 20;
const HALF_HOUR_MINUTES = 30;
const THREE_QUARTERS_HOUR_MINUTES = 45;

export const SLOT_MINUTES = [
    QUARTER_HOUR_MINUTES,
    TWENTY_MINUTES,
    HALF_HOUR_MINUTES,
    THREE_QUARTERS_HOUR_MINUTES,
    MINUTES_PER_HOUR,
] as const;
export type SlotMinutes = (typeof SLOT_MINUTES)[number];
export const SHORTEST_SLOT_MINUTES = Math.min(...SLOT_MINUTES);
export const LONGEST_SLOT_MINUTES = Math.max(...SLOT_MINUTES);
const LAST_WEEKDAY = DAYS_PER_WEEK - 1;

const MAX_WINDOWS_PER_DAY = 3;
const MAX_BLOCKED_DAYS = 60;
const MAX_HORIZON_DAYS = 60;

export const SCHEDULE_LIMITS = {
    windowsPerDay: MAX_WINDOWS_PER_DAY,
    blockedDays: MAX_BLOCKED_DAYS,
    noticeHoursMin: 0,
    noticeHoursMax: HOURS_PER_DAY * DAYS_PER_WEEK,
    horizonDaysMin: 1,
    horizonDaysMax: MAX_HORIZON_DAYS,
} as const;

export const MAX_WINDOWS = DAYS_PER_WEEK * SCHEDULE_LIMITS.windowsPerDay;

export const ViewingWindowSchema = z.object({
    weekday: z.number({ error: 'validation.invalid' }).int().min(0).max(LAST_WEEKDAY),
    start: z.number({ error: 'validation.invalid' }).int().min(0).max(MINUTES_PER_DAY),
    end: z.number({ error: 'validation.invalid' }).int().min(0).max(MINUTES_PER_DAY),
});
export type ViewingWindow = z.infer<typeof ViewingWindowSchema>;

const isSlotMinutes = (value: number): value is SlotMinutes => (SLOT_MINUTES as readonly number[]).includes(value);

interface WindowsDocument {
    slotMinutes: number;
    windows: ViewingWindow[];
}

const windowIssue = (window: ViewingWindow, slotMinutes: number): string | undefined => {
    if (window.end <= window.start) {
        return 'validation.schedule.windows.order';
    }
    return window.end - window.start < slotMinutes ? 'validation.schedule.windows.tooShort' : undefined;
};

const groupByWeekday = (windows: readonly ViewingWindow[]): Map<number, ViewingWindow[]> => {
    const byDay = new Map<number, ViewingWindow[]>();
    for (const window of windows) {
        byDay.set(window.weekday, [...(byDay.get(window.weekday) ?? []), window]);
    }
    return byDay;
};

const hasOverlap = (windows: readonly ViewingWindow[]): boolean => {
    const sorted = [...windows].sort((left, right) => left.start - right.start);
    return sorted.some((current, index) => {
        const previous = sorted[index - 1];
        return previous !== undefined && current.start < previous.end;
    });
};

/**
 * DATA-22: the owner's hours are one JSON document validated on write (the DTO) and again on read;
 * the cross-field rules live in the schema so both agree. One overlap issue per weekday is enough
 * to send the owner back to it.
 */
const checkWindows = (schedule: WindowsDocument, context: z.RefinementCtx): void => {
    schedule.windows.forEach((window, index) => {
        const message = windowIssue(window, schedule.slotMinutes);
        if (message) {
            context.addIssue({ code: 'custom', path: ['windows', index], message });
        }
    });
    for (const windows of groupByWeekday(schedule.windows).values()) {
        if (windows.length > SCHEDULE_LIMITS.windowsPerDay) {
            context.addIssue({ code: 'custom', path: ['windows'], message: 'validation.schedule.windows.tooMany' });
        }
        if (hasOverlap(windows)) {
            context.addIssue({ code: 'custom', path: ['windows'], message: 'validation.schedule.windows.overlap' });
        }
    }
};

export const ViewingScheduleSchema = z
    .object({
        slotMinutes: z
            .number({ error: 'validation.schedule.slotMinutes.invalid' })
            .int()
            .refine(isSlotMinutes, 'validation.schedule.slotMinutes.invalid'),
        noticeHours: z
            .number({ error: 'validation.schedule.noticeHours.invalid' })
            .int()
            .min(SCHEDULE_LIMITS.noticeHoursMin, 'validation.schedule.noticeHours.invalid')
            .max(SCHEDULE_LIMITS.noticeHoursMax, 'validation.schedule.noticeHours.invalid'),
        horizonDays: z
            .number({ error: 'validation.schedule.horizonDays.invalid' })
            .int()
            .min(SCHEDULE_LIMITS.horizonDaysMin, 'validation.schedule.horizonDays.invalid')
            .max(SCHEDULE_LIMITS.horizonDaysMax, 'validation.schedule.horizonDays.invalid'),
        windows: z
            .array(ViewingWindowSchema)
            .min(1, 'validation.schedule.windows.required')
            .max(MAX_WINDOWS, 'validation.schedule.windows.tooMany'),
        blockedDays: z
            .array(z.iso.date({ error: 'validation.schedule.blockedDays.invalid' }))
            .max(SCHEDULE_LIMITS.blockedDays, 'validation.schedule.blockedDays.tooMany'),
    })
    .superRefine(checkWindows);
export type ViewingScheduleDocument = z.infer<typeof ViewingScheduleSchema>;
