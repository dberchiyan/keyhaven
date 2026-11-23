import type { Prisma } from '@/generated/prisma/client';

const readyPhotos = { status: 'READY' } as const;

export const viewingSelect = {
    id: true,
    listingId: true,
    tenantId: true,
    startsAt: true,
    endsAt: true,
    status: true,
    message: true,
    note: true,
    cancelledBy: true,
    decidedAt: true,
    reminderSentAt: true,
    createdAt: true,
    version: true,
    listing: {
        select: {
            id: true,
            title: true,
            kind: true,
            neighborhood: true,
            addressLine1: true,
            addressLine2: true,
            isDemo: true,
            landlordId: true,
            agencyId: true,
            city: { select: { name: true, state: true, slug: true, timeZone: true } },
            photos: {
                where: readyPhotos,
                select: { url: true, storageKey: true },
                orderBy: { position: 'asc' },
                take: 1,
            },
            landlord: { select: { email: true, firstName: true } },
            agency: { select: { email: true, name: true } },
        },
    },
    tenant: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
} satisfies Prisma.ViewingSelect;
export type ViewingRecord = Prisma.ViewingGetPayload<{ select: typeof viewingSelect }>;

export const viewingStatusSelect = {
    id: true,
    status: true,
    startsAt: true,
    version: true,
} satisfies Prisma.ViewingSelect;
export type ViewingStatusRecord = Prisma.ViewingGetPayload<{ select: typeof viewingStatusSelect }>;

export const viewingScheduleSelect = {
    listingId: true,
    slotMinutes: true,
    noticeHours: true,
    horizonDays: true,
    windows: true,
    blockedDays: true,
    updatedAt: true,
    version: true,
    listing: { select: { city: { select: { timeZone: true } } } },
} satisfies Prisma.ViewingScheduleSelect;
export type ViewingScheduleRecord = Prisma.ViewingScheduleGetPayload<{
    select: typeof viewingScheduleSelect;
}>;

export const bookableListingSelect = {
    id: true,
    title: true,
    status: true,
    landlordId: true,
    agencyId: true,
    city: { select: { timeZone: true } },
    viewingSchedule: {
        select: {
            slotMinutes: true,
            noticeHours: true,
            horizonDays: true,
            windows: true,
            blockedDays: true,
        },
    },
} satisfies Prisma.ListingSelect;
export type BookableListingRecord = Prisma.ListingGetPayload<{
    select: typeof bookableListingSelect;
}>;
