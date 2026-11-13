import type { Prisma } from '../../../../generated/prisma/client';
import { MAX_PHOTOS } from '../../service/photo-status';

export const citySelect = {
  id: true,
  name: true,
  state: true,
  slug: true,
  timeZone: true,
} satisfies Prisma.CitySelect;
export type CityRecord = Prisma.CityGetPayload<{ select: typeof citySelect }>;

/** Only finished uploads are shown, in their order. */
const readyPhotos = { status: 'READY' } as const;

/** A search result card: one photo (the cover), the public part of the address. */
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
  availableFrom: true,
  publishedAt: true,
  city: { select: citySelect },
  // Bounded: the cover only.
  photos: {
    where: readyPhotos,
    select: { url: true, storageKey: true },
    orderBy: { position: 'asc' },
    take: 1,
  },
} satisfies Prisma.ListingSelect;
export type ListingCardRecord = Prisma.ListingGetPayload<{ select: typeof listingCardSelect }>;

/** The card plus whether one viewer saved it: `savedBy` filtered to that viewer (0 or 1 row). */
export const viewerCardSelect = (viewerUserId: string | null) =>
  ({
    ...listingCardSelect,
    savedBy: {
      where: { userId: viewerUserId ?? '00000000-0000-0000-0000-000000000000' },
      select: { userId: true },
      take: 1,
    },
  }) satisfies Prisma.ListingSelect;
export type ViewerCardRecord = Prisma.ListingGetPayload<{
  select: ReturnType<typeof viewerCardSelect>;
}>;

/** The owner's dashboard row: the card plus its status, views and saves. */
export const managedListingCardSelect = {
  ...listingCardSelect,
  status: true,
  _count: { select: { views: true, savedBy: true } },
} satisfies Prisma.ListingSelect;
export type ManagedListingCardRecord = Prisma.ListingGetPayload<{
  select: typeof managedListingCardSelect;
}>;

/** Everything about one listing, the private address included — the mapper decides who sees it. */
export const listingDetailSelect = {
  ...listingCardSelect,
  description: true,
  furnished: true,
  petsAllowed: true,
  parking: true,
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

/** The owner's page: the detail plus the viewer-independent counts and every photo, pending ones too. */
export const managedListingSelect = {
  ...listingDetailSelect,
  cityId: true,
  _count: { select: { views: true, savedBy: true } },
} satisfies Prisma.ListingSelect;
export type ManagedListingRecord = Prisma.ListingGetPayload<{
  select: typeof managedListingSelect;
}>;

/** Every photo of a listing as its owner sees it (pending intents included), bounded. */
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

/** A photo row during the upload: whose listing, where it is stored, what was declared. */
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

/** For a status change: the current status and version only. */
export const listingStatusSelect = {
  id: true,
  title: true,
  status: true,
  version: true,
} satisfies Prisma.ListingSelect;
export type ListingStatusRecord = Prisma.ListingGetPayload<{ select: typeof listingStatusSelect }>;
