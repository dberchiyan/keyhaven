import { fromApiKind } from '@/shared/lib/listingSearch';
import type { ListingDetail } from '../types';
import { useListingCount } from './useListingQueries';

/**
 * How many homes of the same kind are listed in this home's neighborhood (or city) right now —
 * the catalogue's own count, so the number is never invented. The text search matches the
 * neighborhood's name in the listing text.
 */
export const useNearbyCount = (listing: ListingDetail) => {
  const filters = {
    kind: fromApiKind(listing.kind),
    city: listing.city.slug,
    ...(listing.neighborhood === null ? {} : { q: listing.neighborhood }),
  };
  const count = useListingCount(filters, true);
  return {
    filters,
    // This home is one of them.
    others: count.data === undefined ? undefined : Math.max(0, count.data - 1),
  };
};
