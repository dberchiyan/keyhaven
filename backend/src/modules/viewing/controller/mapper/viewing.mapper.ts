import type { Viewing, ViewingSchedule, ViewingSlots } from '@/modules/viewing/service/viewing.types';

import type { ViewingBody, ViewingScheduleBody, ViewingSlotsBody } from '../dto/viewing.response';

export const toViewingResponse = (viewing: Viewing): ViewingBody => ({
    id: viewing.id,
    status: viewing.status,
    startsAt: viewing.startsAt.toISOString(),
    endsAt: viewing.endsAt.toISOString(),
    message: viewing.message,
    note: viewing.note,
    cancelledBy: viewing.cancelledBy,
    decidedAt: viewing.decidedAt?.toISOString() ?? null,
    createdAt: viewing.createdAt.toISOString(),
    version: viewing.version,
    listing: {
        id: viewing.listing.id,
        title: viewing.listing.title,
        kind: viewing.listing.kind,
        coverPhotoUrl: viewing.listing.coverPhotoUrl,
        neighborhood: viewing.listing.neighborhood,
        city: {
            name: viewing.listing.city.name,
            state: viewing.listing.city.state,
            slug: viewing.listing.city.slug,
            timeZone: viewing.listing.city.timeZone,
        },
        address: viewing.listing.address,
        isDemo: viewing.listing.isDemo,
    },
    tenant: viewing.tenant
        ? {
              id: viewing.tenant.id,
              firstName: viewing.tenant.firstName,
              lastName: viewing.tenant.lastName,
              email: viewing.tenant.email,
              phone: viewing.tenant.phone,
          }
        : null,
});

export const toViewingScheduleResponse = (schedule: ViewingSchedule): ViewingScheduleBody => ({
    listingId: schedule.listingId,
    timeZone: schedule.timeZone,
    slotMinutes: schedule.slotMinutes,
    noticeHours: schedule.noticeHours,
    horizonDays: schedule.horizonDays,
    windows: schedule.windows.map((window) => ({
        weekday: window.weekday,
        start: window.start,
        end: window.end,
    })),
    blockedDays: [...schedule.blockedDays],
    updatedAt: schedule.updatedAt.toISOString(),
    version: schedule.version,
});

export const toViewingSlotsResponse = (slots: ViewingSlots): ViewingSlotsBody => ({
    isOpen: slots.isOpen,
    timeZone: slots.timeZone,
    slotMinutes: slots.slotMinutes,
    noticeHours: slots.noticeHours,
    horizonEndsOn: slots.horizonEndsOn,
    from: slots.from,
    days: slots.days.map((day) => ({
        day: day.day,
        slots: day.slots.map((slot) => ({
            startsAt: slot.startsAt.toISOString(),
            endsAt: slot.endsAt.toISOString(),
        })),
    })),
});
