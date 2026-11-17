export const ListingKind = {
    RENT: 'RENT',
    SALE: 'SALE',
} as const;
export type ListingKind = (typeof ListingKind)[keyof typeof ListingKind];

export const LISTING_KINDS = Object.values(ListingKind) as [ListingKind, ...ListingKind[]];

/** The price is a monthly rent or an asking price by kind; ck_listings_kind allows no other value. */
export const isListingKind = (value: string): value is ListingKind =>
    (LISTING_KINDS as readonly string[]).includes(value);
