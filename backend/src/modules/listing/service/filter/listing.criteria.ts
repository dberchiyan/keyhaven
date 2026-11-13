import type { Decimal } from '../../../../common/persistence/money';
import type { ListingStatus } from '../listing-status';

/**
 * Resolved search filters (tenant side): published listings only. Every value is already
 * parsed (money as Decimal, days as UTC instants); the repository turns them into the query.
 */
export interface ListingCriteria {
  /** A city slug (`austin`); absent = every city. */
  citySlug?: string;
  rentMin?: Decimal;
  rentMax?: Decimal;
  /** At least this many bedrooms (0 = studios included). */
  bedroomsMin?: number;
  /** At least this many bathrooms ("1.5"). */
  bathroomsMin?: Decimal;
  petsAllowed?: boolean;
  furnished?: boolean;
  parking?: boolean;
  /** Available on or before this day. */
  availableBy?: Date;
  /** Typo-tolerant terms (split, trimmed, ≤ 5), each matched against title, neighborhood, zip or city. */
  searchTerms: string[];
  /** Digests: only listings published after this instant. */
  publishedAfter?: Date;
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
