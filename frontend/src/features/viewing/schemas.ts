import { z } from 'zod';

import { DAYS_PER_WEEK } from '@/shared/lib/units';

import { minutesToTime, SATURDAY, SUNDAY, timeToMinutes, WEEK_DAYS } from './format';
import type { SaveViewingScheduleRequest, ViewingSchedule } from './types';

/** Mirrors backend ViewingScheduleSchema (viewing/service/viewing-schedule.ts). */
export const SCHEDULE_LIMITS = { windowsPerDay: 3, blockedDays: 60 } as const;
export const SLOT_MINUTES = ['15', '20', '30', '45', '60'] as const;
export const NOTICE_HOURS = ['0', '2', '4', '12', '24', '48', '72'] as const;
export const HORIZON_DAYS = ['7', '14', '21', '30', '45', '60'] as const;

const rangeSchema = z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'validation:invalid'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'validation:invalid'),
});
const daySchema = z.object({
    enabled: z.boolean(),
    ranges: z.array(rangeSchema).max(SCHEDULE_LIMITS.windowsPerDay, 'validation:schedule.windows.tooMany'),
});

type DayValues = z.input<typeof daySchema>;

const hasOverlap = (ranges: readonly { start: number; end: number }[]): boolean => {
    const sorted = [...ranges].sort((left, right) => left.start - right.start);
    return sorted.some((range, index) => index > 0 && range.start < (sorted[index - 1]?.end ?? range.start));
};

/** The first rule an open day breaks, in the backend's order, so the form says what the server would. */
const openDayIssue = (day: DayValues, slotMinutes: number): string | undefined => {
    if (day.ranges.length === 0) {
        return 'validation:schedule.windows.required';
    }
    const minutes = day.ranges.map((range) => ({ start: timeToMinutes(range.start), end: timeToMinutes(range.end) }));
    const broken = minutes.find((range) => range.end <= range.start || range.end - range.start < slotMinutes);
    if (broken) {
        return broken.end <= broken.start
            ? 'validation:schedule.windows.order'
            : 'validation:schedule.windows.tooShort';
    }
    return hasOverlap(minutes) ? 'validation:schedule.windows.overlap' : undefined;
};

export const scheduleSchema = z
    .object({
        slotMinutes: z.enum(SLOT_MINUTES),
        noticeHours: z.enum(NOTICE_HOURS),
        horizonDays: z.enum(HORIZON_DAYS),
        days: z.array(daySchema).length(DAYS_PER_WEEK),
        blockedDays: z
            .array(z.iso.date('validation:schedule.blockedDays.invalid'))
            .max(SCHEDULE_LIMITS.blockedDays, 'validation:schedule.blockedDays.tooMany'),
    })
    .superRefine((values, context) => {
        const slotMinutes = Number(values.slotMinutes);
        values.days.forEach((day, weekday) => {
            const message = day.enabled ? openDayIssue(day, slotMinutes) : undefined;
            if (message !== undefined) {
                context.addIssue({ code: 'custom', path: ['days', weekday], message });
            }
        });
        if (!values.days.some((day) => day.enabled && day.ranges.length > 0)) {
            context.addIssue({ code: 'custom', path: ['days'], message: 'validation:schedule.windows.required' });
        }
    });

export type ScheduleValues = z.input<typeof scheduleSchema>;
export type ScheduleOutput = z.output<typeof scheduleSchema>;

export const DEFAULT_RANGE = { start: '17:00', end: '19:00' } as const;
export const NEXT_RANGE_END = '20:00';
const SATURDAY_RANGE = { start: '10:00', end: '14:00' } as const;
const DEFAULT_SLOT = '30';
const DEFAULT_NOTICE = '12';
const DEFAULT_HORIZON = '14';

const defaultDay = (weekday: number): ScheduleValues['days'][number] => {
    if (weekday === SUNDAY) {
        return { enabled: false, ranges: [] };
    }
    return { enabled: true, ranges: [weekday === SATURDAY ? { ...SATURDAY_RANGE } : { ...DEFAULT_RANGE }] };
};

/** Weekday evenings and Saturday mornings: when people can come after work, so a new listing starts there. */
export const defaultScheduleValues = (): ScheduleValues => ({
    slotMinutes: DEFAULT_SLOT,
    noticeHours: DEFAULT_NOTICE,
    horizonDays: DEFAULT_HORIZON,
    days: WEEK_DAYS.map(defaultDay),
    blockedDays: [],
});

const asOption = <T extends string>(options: readonly T[], value: number, fallback: T): T =>
    options.find((option) => option === String(value)) ?? fallback;

/** The stored hours as form values; a value the options no longer offer falls back to the default. */
export const scheduleToValues = (schedule: ViewingSchedule): ScheduleValues => ({
    slotMinutes: asOption(SLOT_MINUTES, schedule.slotMinutes, DEFAULT_SLOT),
    noticeHours: asOption(NOTICE_HOURS, schedule.noticeHours, DEFAULT_NOTICE),
    horizonDays: asOption(HORIZON_DAYS, schedule.horizonDays, DEFAULT_HORIZON),
    days: WEEK_DAYS.map((weekday) => {
        const ranges = schedule.windows
            .filter((window) => window.weekday === weekday)
            .sort((left, right) => left.start - right.start)
            .map((window) => ({ start: minutesToTime(window.start), end: minutesToTime(window.end) }));
        return { enabled: ranges.length > 0, ranges };
    }),
    blockedDays: [...schedule.blockedDays],
});

/** Form values as the request: the API keeps open days as weekday windows in minutes (Sunday = 0). */
export const toScheduleRequest = (values: ScheduleOutput, version: number | null): SaveViewingScheduleRequest => ({
    slotMinutes: Number(values.slotMinutes),
    noticeHours: Number(values.noticeHours),
    horizonDays: Number(values.horizonDays),
    windows: values.days.flatMap((day, weekday) =>
        day.enabled
            ? day.ranges.map((range) => ({
                  weekday,
                  start: timeToMinutes(range.start),
                  end: timeToMinutes(range.end),
              }))
            : [],
    ),
    blockedDays: [...values.blockedDays].sort(),
    version,
});
