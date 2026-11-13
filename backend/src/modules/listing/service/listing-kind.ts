/** For rent (the price is a monthly rent) or for sale (the asking price). Mirrored by ck_listings_kind. */
export const ListingKind = {
  RENT: 'RENT',
  SALE: 'SALE',
} as const;
export type ListingKind = (typeof ListingKind)[keyof typeof ListingKind];

export const LISTING_KINDS = Object.values(ListingKind) as [ListingKind, ...ListingKind[]];

export const isListingKind = (value: string): value is ListingKind =>
  (LISTING_KINDS as readonly string[]).includes(value);
