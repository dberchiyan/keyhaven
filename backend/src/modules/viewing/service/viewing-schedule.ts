import { z } from 'zod';

/** How long one viewing takes — mirrored by ck_viewing_schedules_slot_minutes. */
export const SLOT_MINUTES = [15, 20, 30, 45, 60] as const;
export type SlotMinutes = (typeof SLOT_MINUTES)[number];

export const MINUTES_PER_DAY = 24 * 60;

/** The schedule's bounds (the CHECK constraints mirror the hours and days). */
export const SCHEDULE_LIMITS = {
  /** Time ranges per weekday: morning, afternoon, evening is plenty. */
  windowsPerDay: 3,
  blockedDays: 60,
  noticeHoursMin: 0,
  /** A week: longer notice makes the horizon pointless. */
  noticeHoursMax: 168,
  horizonDaysMin: 1,
  horizonDaysMax: 60,
} as const;

/** One time range of a weekday, in minutes of the city's local day (`start` < `end`). */
export const ViewingWindowSchema = z.object({
  /** Sunday = 0 … Saturday = 6 (as `Date#getUTCDay`). */
  weekday: z.number({ error: 'validation.invalid' }).int().min(0).max(6),
  start: z.number({ error: 'validation.invalid' }).int().min(0).max(MINUTES_PER_DAY),
  end: z.number({ error: 'validation.invalid' }).int().min(0).max(MINUTES_PER_DAY),
});
export type ViewingWindow = z.infer<typeof ViewingWindowSchema>;

const isSlotMinutes = (value: number): value is SlotMinutes =>
  (SLOT_MINUTES as readonly number[]).includes(value);

/**
 * The owner's hours as one document: the length of a viewing, the notice a tenant must give,
 * how far ahead the calendar opens, the weekly windows and the days off. Validated on write
 * (the DTO) and again on read (data.md → JSON); the cross-field rules live here so both agree.
 */
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
      .max(7 * SCHEDULE_LIMITS.windowsPerDay, 'validation.schedule.windows.tooMany'),
    blockedDays: z
      .array(z.iso.date({ error: 'validation.schedule.blockedDays.invalid' }))
      .max(SCHEDULE_LIMITS.blockedDays, 'validation.schedule.blockedDays.tooMany'),
  })
  .superRefine((schedule, context) => {
    const byDay = new Map<number, ViewingWindow[]>();
    schedule.windows.forEach((window, index) => {
      if (window.end <= window.start) {
        context.addIssue({
          code: 'custom',
          path: ['windows', index],
          message: 'validation.schedule.windows.order',
        });
      } else if (window.end - window.start < schedule.slotMinutes) {
        context.addIssue({
          code: 'custom',
          path: ['windows', index],
          message: 'validation.schedule.windows.tooShort',
        });
      }
      byDay.set(window.weekday, [...(byDay.get(window.weekday) ?? []), window]);
    });
    for (const windows of byDay.values()) {
      if (windows.length > SCHEDULE_LIMITS.windowsPerDay) {
        context.addIssue({
          code: 'custom',
          path: ['windows'],
          message: 'validation.schedule.windows.tooMany',
        });
      }
      const sorted = [...windows].sort((left, right) => left.start - right.start);
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];
        if (previous && current && current.start < previous.end) {
          context.addIssue({
            code: 'custom',
            path: ['windows'],
            message: 'validation.schedule.windows.overlap',
          });
          // One issue per weekday is enough to send the owner back to it.
          break;
        }
      }
    }
  });
export type ViewingScheduleDocument = z.infer<typeof ViewingScheduleSchema>;
