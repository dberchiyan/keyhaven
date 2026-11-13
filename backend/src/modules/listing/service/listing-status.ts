/** Mirrored by ck_listings_status. */
export const ListingStatus = {
  /** Being written; nobody but the owner sees it. */
  DRAFT: 'DRAFT',
  /** On the site: tenants find it in search. */
  PUBLISHED: 'PUBLISHED',
  /** Taken off the site by its owner; can be published again. */
  UNPUBLISHED: 'UNPUBLISHED',
  /** Taken off the site by a Keyhaven admin; the owner cannot publish it again. */
  SUSPENDED: 'SUSPENDED',
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const LISTING_STATUSES = Object.values(ListingStatus) as [ListingStatus, ...ListingStatus[]];

export const isListingStatus = (value: string): value is ListingStatus =>
  (LISTING_STATUSES as readonly string[]).includes(value);

/**
 * The owner's and the admin's transitions (architecture.md → state machines are one table); any
 * other transition is refused. A transition to the current status is a no-op, never an error.
 */
export const LISTING_TRANSITIONS = {
  publish: { from: [ListingStatus.DRAFT, ListingStatus.UNPUBLISHED], to: ListingStatus.PUBLISHED },
  unpublish: { from: [ListingStatus.PUBLISHED], to: ListingStatus.UNPUBLISHED },
  suspend: {
    from: [ListingStatus.DRAFT, ListingStatus.PUBLISHED, ListingStatus.UNPUBLISHED],
    to: ListingStatus.SUSPENDED,
  },
} as const satisfies Record<string, { from: readonly ListingStatus[]; to: ListingStatus }>;
export type ListingTransition = keyof typeof LISTING_TRANSITIONS;

/** The owner edits a listing while it is theirs to shape: never once an admin suspended it. */
export const EDITABLE_STATUSES = [
  ListingStatus.DRAFT,
  ListingStatus.PUBLISHED,
  ListingStatus.UNPUBLISHED,
] as const satisfies readonly ListingStatus[];
