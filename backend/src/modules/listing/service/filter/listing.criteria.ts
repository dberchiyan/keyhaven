import type { ListingStatus } from '../listing-status';

/** Resolved search filters (tenant side): only published listings, by city. */
export interface ListingCriteria {
  /** A city slug (`austin`); absent = every city. */
  citySlug?: string;
}

/**
 * The owner's dashboard filters. The scope (whose listings) is not a filter: the service derives
 * it from the principal and the repository puts it in the query.
 */
export interface ManagedListingCriteria {
  status?: ListingStatus;
  /** Search terms (split, trimmed, ≤ 5), each matched against the title and the city name. */
  searchTerms: string[];
}
