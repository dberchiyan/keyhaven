import { z } from 'zod';
import { timeToMinutes } from './format';
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

export const scheduleSchema = z
    .object({
        slotMinutes: z.enum(SLOT_MINUTES),
        noticeHours: z.enum(NOTICE_HOURS),
        horizonDays: z.enum(HORIZON_DAYS),
        /** Index = weekday, Sunday = 0 (as the API has it). */
        days: z.array(daySchema).length(7),
        blockedDays: z
            .array(z.iso.date('validation:schedule.blockedDays.invalid'))
            .max(SCHEDULE_LIMITS.blockedDays, 'validation:schedule.blockedDays.tooMany'),
    })
    .superRefine((values, context) => {
        const slot = Number(values.slotMinutes);
        let openDays = 0;
        values.days.forEach((day, weekday) => {
            if (!day.enabled) {
                return;
            }
            if (day.ranges.length === 0) {
                context.addIssue({
                    code: 'custom',
                    path: ['days', weekday],
                    message: 'validation:schedule.windows.required',
                });
                return;
            }
            openDays += 1;
            const minutes = day.ranges.map((range) => ({
                start: timeToMinutes(range.start),
                end: timeToMinutes(range.end),
            }));
            for (const range of minutes) {
                if (range.end <= range.start) {
                    context.addIssue({
                        code: 'custom',
                        path: ['days', weekday],
                        message: 'validation:schedule.windows.order',
                    });
                    return;
                }
                if (range.end - range.start < slot) {
                    context.addIssue({
                        code: 'custom',
                        path: ['days', weekday],
                        message: 'validation:schedule.windows.tooShort',
                    });
                    return;
                }
            }
            const sorted = [...minutes].sort((left, right) => left.start - right.start);
            for (let index = 1; index < sorted.length; index += 1) {
                const previous = sorted[index - 1];
                const current = sorted[index];
                if (previous && current && current.start < previous.end) {
                    context.addIssue({
                        code: 'custom',
                        path: ['days', weekday],
                        message: 'validation:schedule.windows.overlap',
                    });
                    return;
                }
            }
        });
        if (openDays === 0) {
            context.addIssue({
                code: 'custom',
                path: ['days'],
                message: 'validation:schedule.windows.required',
            });
        }
    });

export type ScheduleValues = z.input<typeof scheduleSchema>;
export type ScheduleOutput = z.output<typeof scheduleSchema>;

const MESSAGES = new Set<string>([
    'validation:invalid',
    'validation:schedule.windows.required',
    'validation:schedule.windows.order',
    'validation:schedule.windows.overlap',
    'validation:schedule.windows.tooShort',
    'validation:schedule.windows.tooMany',
    'validation:schedule.blockedDays.invalid',
    'validation:schedule.blockedDays.tooMany',
]);
export type ScheduleValidationMessage =
    | 'validation:invalid'
    | 'validation:schedule.windows.required'
    | 'validation:schedule.windows.order'
    | 'validation:schedule.windows.overlap'
    | 'validation:schedule.windows.tooShort'
    | 'validation:schedule.windows.tooMany'
    | 'validation:schedule.blockedDays.invalid'
    | 'validation:schedule.blockedDays.tooMany';
export const isScheduleValidationMessage = (message: string): message is ScheduleValidationMessage =>
    MESSAGES.has(message);

const minutesToTime = (minutes: number): string =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Weekday evenings and Saturday mornings: a sensible start for a new listing. */
export const defaultScheduleValues = (): ScheduleValues => ({
    slotMinutes: '30',
    noticeHours: '12',
    horizonDays: '14',
    days: [0, 1, 2, 3, 4, 5, 6].map((weekday) =>
        weekday === 0
            ? { enabled: false, ranges: [] }
            : weekday === 6
              ? { enabled: true, ranges: [{ start: '10:00', end: '14:00' }] }
              : { enabled: true, ranges: [{ start: '17:00', end: '19:00' }] },
    ),
    blockedDays: [],
});

const asOption = <T extends string>(options: readonly T[], value: number, fallback: T): T =>
    options.find((option) => option === String(value)) ?? fallback;

/** The stored hours as form values. */
export const scheduleToValues = (schedule: ViewingSchedule): ScheduleValues => ({
    slotMinutes: asOption(SLOT_MINUTES, schedule.slotMinutes, '30'),
    noticeHours: asOption(NOTICE_HOURS, schedule.noticeHours, '12'),
    horizonDays: asOption(HORIZON_DAYS, schedule.horizonDays, '14'),
    days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
        const ranges = schedule.windows
            .filter((window) => window.weekday === weekday)
            .sort((left, right) => left.start - right.start)
            .map((window) => ({ start: minutesToTime(window.start), end: minutesToTime(window.end) }));
        return { enabled: ranges.length > 0, ranges };
    }),
    blockedDays: [...schedule.blockedDays],
});

/** Form values as the request: the open days' ranges become weekday windows in minutes. */
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
