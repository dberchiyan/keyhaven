import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import {
    ADDRESS_LINE_MAX_LENGTH,
    CITY_NAME_MAX_LENGTH,
    CITY_SLUG_MAX_LENGTH,
    EMAIL_MAX_LENGTH,
    LISTING_TITLE_MAX_LENGTH,
    NEIGHBORHOOD_MAX_LENGTH,
    PERSON_NAME_MAX_LENGTH,
    PHONE_MAX_LENGTH,
    PHOTO_URL_MAX_LENGTH,
    TIME_ZONE_MAX_LENGTH,
} from '@/common/dto/limits';
import { pageResponseSchema } from '@/common/dto/page.response';
import { LISTING_KINDS } from '@/modules/listing/service/listing-kind';
import { MAX_OWN_VIEWINGS, MAX_SLOT_DAYS } from '@/modules/viewing/service/viewing-limits';
import {
    LONGEST_SLOT_MINUTES,
    MAX_WINDOWS,
    SCHEDULE_LIMITS,
    SHORTEST_SLOT_MINUTES,
    ViewingWindowSchema,
} from '@/modules/viewing/service/viewing-schedule';
import { CANCELLED_BY, VIEWING_STATUSES } from '@/modules/viewing/service/viewing-status';

import { VIEWING_MESSAGE_MAX, VIEWING_NOTE_MAX } from './viewing.request';

const STATE_CODE_LENGTH = 2;
const MAX_SLOTS_PER_DAY = 300;

export const ViewingStatusSchema = z.enum(VIEWING_STATUSES).meta({ id: 'ViewingStatus' });

export const ViewingScheduleSchema = z
    .object({
        listingId: z.uuid(),
        timeZone: z.string().max(TIME_ZONE_MAX_LENGTH),
        slotMinutes: z.number().int().min(SHORTEST_SLOT_MINUTES).max(LONGEST_SLOT_MINUTES),
        noticeHours: z.number().int().min(0).max(SCHEDULE_LIMITS.noticeHoursMax),
        horizonDays: z.number().int().min(1).max(SCHEDULE_LIMITS.horizonDaysMax),
        windows: z.array(ViewingWindowSchema.meta({ id: 'ViewingWindow' })).max(MAX_WINDOWS),
        blockedDays: z.array(z.iso.date()).max(SCHEDULE_LIMITS.blockedDays),
        updatedAt: z.iso.datetime(),
        version: z.number().int().min(0),
    })
    .meta({ id: 'ViewingSchedule' });

export const ViewingScheduleStateSchema = z
    .object({ schedule: ViewingScheduleSchema.nullable(), timeZone: z.string().max(TIME_ZONE_MAX_LENGTH) })
    .meta({ id: 'ViewingScheduleState' });

const ViewingSlotSchema = z
    .object({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() })
    .meta({ id: 'ViewingSlot' });

export const ViewingSlotsSchema = z
    .object({
        isOpen: z.boolean(),
        timeZone: z.string().max(TIME_ZONE_MAX_LENGTH),
        slotMinutes: z.number().int().min(0).max(LONGEST_SLOT_MINUTES).nullable(),
        noticeHours: z.number().int().min(0).max(SCHEDULE_LIMITS.noticeHoursMax),
        horizonEndsOn: z.iso.date(),
        from: z.iso.date(),
        days: z
            .array(
                z
                    .object({ day: z.iso.date(), slots: z.array(ViewingSlotSchema).max(MAX_SLOTS_PER_DAY) })
                    .meta({ id: 'ViewingSlotDay' }),
            )
            .max(MAX_SLOT_DAYS),
    })
    .meta({ id: 'ViewingSlots' });

const ViewingListingSchema = z
    .object({
        id: z.uuid(),
        title: z.string().max(LISTING_TITLE_MAX_LENGTH),
        kind: z.enum(LISTING_KINDS),
        coverPhotoUrl: z.string().max(PHOTO_URL_MAX_LENGTH).nullable(),
        neighborhood: z.string().max(NEIGHBORHOOD_MAX_LENGTH).nullable(),
        city: z.object({
            name: z.string().max(CITY_NAME_MAX_LENGTH),
            state: z.string().length(STATE_CODE_LENGTH),
            slug: z.string().max(CITY_SLUG_MAX_LENGTH),
            timeZone: z.string().max(TIME_ZONE_MAX_LENGTH),
        }),
        address: z
            .object({
                line1: z.string().max(ADDRESS_LINE_MAX_LENGTH),
                line2: z.string().max(ADDRESS_LINE_MAX_LENGTH).nullable(),
            })
            .nullable(),
        isDemo: z.boolean(),
    })
    .meta({ id: 'ViewingListing' });

const ViewingTenantSchema = z
    .object({
        id: z.uuid(),
        firstName: z.string().max(PERSON_NAME_MAX_LENGTH),
        lastName: z.string().max(PERSON_NAME_MAX_LENGTH),
        email: z.string().max(EMAIL_MAX_LENGTH),
        phone: z.string().max(PHONE_MAX_LENGTH).nullable(),
    })
    .meta({ id: 'ViewingTenant' });

export const ViewingSchema = z
    .object({
        id: z.uuid(),
        status: ViewingStatusSchema,
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
        message: z.string().max(VIEWING_MESSAGE_MAX).nullable(),
        note: z.string().max(VIEWING_NOTE_MAX).nullable(),
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
export class ViewingSummaryResponse extends createZodDto(
    z.object({ requested: z.number().int().min(0), upcoming: z.number().int().min(0) }),
) {}

export class JobRunResponse extends createZodDto(
    z.object({ isSkipped: z.boolean(), count: z.number().int().min(0) }).meta({ id: 'JobRun' }),
) {}
