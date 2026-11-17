import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { pageResponseSchema } from '../../../../common/dto/page.response';
import { LISTING_KINDS } from '../../../listing/service/listing-kind';
import { MAX_OWN_VIEWINGS, MAX_SLOT_DAYS } from '../../service/viewing-limits';
import { SCHEDULE_LIMITS, SLOT_MINUTES, ViewingWindowSchema } from '../../service/viewing-schedule';
import { CANCELLED_BY, VIEWING_STATUSES } from '../../service/viewing-status';

export const ViewingStatusSchema = z.enum(VIEWING_STATUSES).meta({ id: 'ViewingStatus' });

/** The owner's hours as stored, with the zone they are written in. */
export const ViewingScheduleSchema = z
    .object({
        listingId: z.uuid(),
        timeZone: z.string().max(64),
        slotMinutes: z
            .number()
            .int()
            .min(SLOT_MINUTES[0])
            .max(SLOT_MINUTES[SLOT_MINUTES.length - 1] ?? 60),
        noticeHours: z.number().int().min(0).max(SCHEDULE_LIMITS.noticeHoursMax),
        horizonDays: z.number().int().min(1).max(SCHEDULE_LIMITS.horizonDaysMax),
        windows: z.array(ViewingWindowSchema.meta({ id: 'ViewingWindow' })).max(7 * SCHEDULE_LIMITS.windowsPerDay),
        blockedDays: z.array(z.iso.date()).max(SCHEDULE_LIMITS.blockedDays),
        updatedAt: z.iso.datetime(),
        version: z.number().int().min(0),
    })
    .meta({ id: 'ViewingSchedule' });

/** The listing's hours, or none yet (`schedule: null`) — the zone is always there for the editor. */
export const ViewingScheduleStateSchema = z
    .object({ schedule: ViewingScheduleSchema.nullable(), timeZone: z.string().max(64) })
    .meta({ id: 'ViewingScheduleState' });

const ViewingSlotSchema = z
    .object({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() })
    .meta({ id: 'ViewingSlot' });

/** The slots a tenant can book, grouped by the city's local day. */
export const ViewingSlotsSchema = z
    .object({
        /** False when the home has no viewing hours: nothing to book, contact the lister. */
        open: z.boolean(),
        timeZone: z.string().max(64),
        slotMinutes: z.number().int().min(0).max(60).nullable(),
        noticeHours: z.number().int().min(0).max(SCHEDULE_LIMITS.noticeHoursMax),
        /** The last local day slots are offered for (the owner's horizon). */
        horizonEnd: z.iso.date(),
        from: z.iso.date(),
        days: z
            .array(
                z
                    .object({ day: z.iso.date(), slots: z.array(ViewingSlotSchema).max(300) })
                    .meta({ id: 'ViewingSlotDay' }),
            )
            .max(MAX_SLOT_DAYS),
    })
    .meta({ id: 'ViewingSlots' });

const ViewingListingSchema = z
    .object({
        id: z.uuid(),
        title: z.string().max(120),
        kind: z.enum(LISTING_KINDS),
        coverPhotoUrl: z.string().max(500).nullable(),
        neighborhood: z.string().max(100).nullable(),
        city: z.object({
            name: z.string().max(100),
            state: z.string().length(2),
            slug: z.string().max(100),
            timeZone: z.string().max(64),
        }),
        /** The exact address: the owner's side always, the tenant's once the viewing is confirmed. */
        address: z.object({ line1: z.string().max(255), line2: z.string().max(255).nullable() }).nullable(),
        /** A showcase home of the public demo. */
        demo: z.boolean(),
    })
    .meta({ id: 'ViewingListing' });

/** Who asked — the owner's side only; null on the tenant's own view. */
const ViewingTenantSchema = z
    .object({
        id: z.uuid(),
        firstName: z.string().max(100),
        lastName: z.string().max(100),
        email: z.string().max(254),
        phone: z.string().max(32).nullable(),
    })
    .meta({ id: 'ViewingTenant' });

export const ViewingSchema = z
    .object({
        id: z.uuid(),
        status: ViewingStatusSchema,
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
        message: z.string().max(500).nullable(),
        note: z.string().max(300).nullable(),
        cancelledBy: z.enum(CANCELLED_BY).nullable(),
        decidedAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        version: z.number().int().min(0),
        listing: ViewingListingSchema,
        tenant: ViewingTenantSchema.nullable(),
    })
    .meta({ id: 'Viewing' });
export type ViewingBody = z.infer<typeof ViewingSchema>;
export type ViewingScheduleBody = z.infer<typeof ViewingScheduleSchema>;
export type ViewingSlotsBody = z.infer<typeof ViewingSlotsSchema>;

export class ViewingResponse extends createZodDto(z.object(ViewingSchema.shape)) {}
export class ViewingListResponse extends createZodDto(
    z.object({ content: z.array(ViewingSchema).max(MAX_OWN_VIEWINGS) }),
) {}
export class ViewingPageResponse extends createZodDto(pageResponseSchema(ViewingSchema)) {}
export class ViewingSlotsResponse extends createZodDto(z.object(ViewingSlotsSchema.shape)) {}
export class ViewingScheduleResponse extends createZodDto(z.object(ViewingScheduleSchema.shape)) {}
export class ViewingScheduleStateResponse extends createZodDto(z.object(ViewingScheduleStateSchema.shape)) {}
/** Requests waiting for an answer and confirmed viewings ahead, over the caller's scope. */
export class ViewingSummaryResponse extends createZodDto(
    z.object({ requested: z.number().int().min(0), upcoming: z.number().int().min(0) }),
) {}
