export const ListingStatus = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    UNPUBLISHED: 'UNPUBLISHED',
    SUSPENDED: 'SUSPENDED',
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const LISTING_STATUSES = Object.values(ListingStatus) as [ListingStatus, ...ListingStatus[]];

/** ck_listings_status allows no other value: an owner unpublishes, only an admin suspends. */
export const isListingStatus = (value: string): value is ListingStatus =>
    (LISTING_STATUSES as readonly string[]).includes(value);

export const LISTING_TRANSITIONS = {
    publish: { from: [ListingStatus.DRAFT, ListingStatus.UNPUBLISHED], to: ListingStatus.PUBLISHED },
    unpublish: { from: [ListingStatus.PUBLISHED], to: ListingStatus.UNPUBLISHED },
    suspend: {
        from: [ListingStatus.DRAFT, ListingStatus.PUBLISHED, ListingStatus.UNPUBLISHED],
        to: ListingStatus.SUSPENDED,
    },
} as const satisfies Record<string, { from: readonly ListingStatus[]; to: ListingStatus }>;
export type ListingTransition = keyof typeof LISTING_TRANSITIONS;

export const EDITABLE_STATUSES = [
    ListingStatus.DRAFT,
    ListingStatus.PUBLISHED,
    ListingStatus.UNPUBLISHED,
] as const satisfies readonly ListingStatus[];
