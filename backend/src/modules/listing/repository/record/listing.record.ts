import type { Prisma } from '../../../../generated/prisma/client';

export const citySelect = {
  id: true,
  name: true,
  state: true,
  slug: true,
  timeZone: true,
} satisfies Prisma.CitySelect;
export type CityRecord = Prisma.CityGetPayload<{ select: typeof citySelect }>;

/** A search result card: one photo (the cover), the public part of the address. */
export const listingCardSelect = {
  id: true,
  title: true,
  propertyType: true,
  rent: true,
  currency: true,
  bedrooms: true,
  bathrooms: true,
  sizeSqft: true,
  neighborhood: true,
  availableFrom: true,
  publishedAt: true,
  city: { select: citySelect },
  // Bounded: the cover only.
  photos: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
} satisfies Prisma.ListingSelect;
export type ListingCardRecord = Prisma.ListingGetPayload<{ select: typeof listingCardSelect }>;

/** The owner's dashboard row: the card plus its status. */
export const managedListingCardSelect = {
  ...listingCardSelect,
  status: true,
} satisfies Prisma.ListingSelect;
export type ManagedListingCardRecord = Prisma.ListingGetPayload<{
  select: typeof managedListingCardSelect;
}>;

/** The photo gallery is bounded: a listing holds at most this many photos (M1 enforces it). */
export const MAX_PHOTOS = 20;

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
  photos: { select: { id: true, url: true }, orderBy: { position: 'asc' }, take: MAX_PHOTOS },
  landlord: { select: { firstName: true, lastName: true, phone: true, email: true } },
  agency: { select: { name: true, phone: true, email: true, website: true } },
} satisfies Prisma.ListingSelect;
export type ListingDetailRecord = Prisma.ListingGetPayload<{ select: typeof listingDetailSelect }>;

/** For a status change: the current status and version only. */
export const listingStatusSelect = {
  id: true,
  title: true,
  status: true,
  version: true,
} satisfies Prisma.ListingSelect;
export type ListingStatusRecord = Prisma.ListingGetPayload<{ select: typeof listingStatusSelect }>;
