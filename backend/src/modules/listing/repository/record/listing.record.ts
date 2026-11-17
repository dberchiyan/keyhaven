import type { Prisma } from '@/generated/prisma/client';
import { MAX_PHOTOS } from '@/modules/listing/service/photo-status';

export const citySelect = {
    id: true,
    name: true,
    state: true,
    slug: true,
    timeZone: true,
} satisfies Prisma.CitySelect;
export type CityRecord = Prisma.CityGetPayload<{ select: typeof citySelect }>;

const readyPhotos = { status: 'READY' } as const;
const NO_VIEWER_USER_ID = '00000000-0000-0000-0000-000000000000';

interface SavedByViewerSelect {
    where: { userId: string };
    select: { userId: true };
    take: 1;
}

/** The viewer's own save only (0 or 1 row): a visitor matches nobody, so the card says "not saved". */
const savedByViewer = (viewerUserId: string | null): SavedByViewerSelect => ({
    where: { userId: viewerUserId ?? NO_VIEWER_USER_ID },
    select: { userId: true },
    take: 1,
});

export const listingCardSelect = {
    id: true,
    title: true,
    propertyType: true,
    kind: true,
    price: true,
    currency: true,
    bedrooms: true,
    bathrooms: true,
    sizeSqft: true,
    neighborhood: true,
    availableAt: true,
    publishedAt: true,
    isDemo: true,
    city: { select: citySelect },
    photos: {
        where: readyPhotos,
        select: { url: true, storageKey: true },
        orderBy: { position: 'asc' },
        take: 1,
    },
    _count: { select: { views: true } },
} satisfies Prisma.ListingSelect;
export type ListingCardRecord = Prisma.ListingGetPayload<{ select: typeof listingCardSelect }>;

export type ViewerCardSelect = typeof listingCardSelect & { savedBy: SavedByViewerSelect };
export const viewerCardSelect = (viewerUserId: string | null): ViewerCardSelect =>
    ({ ...listingCardSelect, savedBy: savedByViewer(viewerUserId) }) satisfies Prisma.ListingSelect;
export type ViewerCardRecord = Prisma.ListingGetPayload<{ select: ViewerCardSelect }>;

export const managedListingCardSelect = {
    ...listingCardSelect,
    status: true,
    _count: { select: { views: true, savedBy: true } },
} satisfies Prisma.ListingSelect;
export type ManagedListingCardRecord = Prisma.ListingGetPayload<{
    select: typeof managedListingCardSelect;
}>;

export const listingDetailSelect = {
    ...listingCardSelect,
    description: true,
    isFurnished: true,
    isPetFriendly: true,
    hasParking: true,
    zip: true,
    addressLine1: true,
    addressLine2: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    version: true,
    landlordId: true,
    agencyId: true,
    photos: {
        where: readyPhotos,
        select: { id: true, url: true, storageKey: true },
        orderBy: { position: 'asc' },
        take: MAX_PHOTOS,
    },
    landlord: { select: { firstName: true, lastName: true, phone: true, email: true } },
    agency: { select: { name: true, phone: true, email: true, website: true } },
} satisfies Prisma.ListingSelect;
export type ListingDetailRecord = Prisma.ListingGetPayload<{ select: typeof listingDetailSelect }>;

export type ViewerDetailSelect = typeof listingDetailSelect & { savedBy: SavedByViewerSelect };
export const viewerDetailSelect = (viewerUserId: string | null): ViewerDetailSelect =>
    ({ ...listingDetailSelect, savedBy: savedByViewer(viewerUserId) }) satisfies Prisma.ListingSelect;
export type ViewerDetailRecord = Prisma.ListingGetPayload<{ select: ViewerDetailSelect }>;

export const managedListingSelect = {
    ...listingDetailSelect,
    cityId: true,
    _count: { select: { views: true, savedBy: true } },
} satisfies Prisma.ListingSelect;
export type ManagedListingRecord = Prisma.ListingGetPayload<{
    select: typeof managedListingSelect;
}>;

export const managedPhotoSelect = {
    id: true,
    url: true,
    storageKey: true,
    status: true,
    position: true,
    createdAt: true,
} satisfies Prisma.ListingPhotoSelect;
export type ManagedPhotoRecord = Prisma.ListingPhotoGetPayload<{
    select: typeof managedPhotoSelect;
}>;

export const photoUploadSelect = {
    id: true,
    listingId: true,
    storageKey: true,
    contentType: true,
    sizeBytes: true,
    status: true,
    position: true,
} satisfies Prisma.ListingPhotoSelect;
export type PhotoUploadRecord = Prisma.ListingPhotoGetPayload<{ select: typeof photoUploadSelect }>;

export const listingStatusSelect = {
    id: true,
    title: true,
    status: true,
    version: true,
} satisfies Prisma.ListingSelect;
export type ListingStatusRecord = Prisma.ListingGetPayload<{ select: typeof listingStatusSelect }>;
