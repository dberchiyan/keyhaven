import type { SearchFilters } from '@/shared/lib/listingSearch';
import type { SavedSearchCriteria } from './types';

/** The page's filters as the API's saved criteria — the same keys, only the defined ones. */
export const toCriteria = (filters: SearchFilters): SavedSearchCriteria => ({
  ...(filters.city === undefined ? {} : { city: filters.city }),
  ...(filters.rentMin === undefined ? {} : { rentMin: filters.rentMin }),
  ...(filters.rentMax === undefined ? {} : { rentMax: filters.rentMax }),
  ...(filters.beds === undefined ? {} : { beds: filters.beds }),
  ...(filters.baths === undefined ? {} : { baths: filters.baths }),
  ...(filters.pets === undefined ? {} : { pets: filters.pets }),
  ...(filters.furnished === undefined ? {} : { furnished: filters.furnished }),
  ...(filters.parking === undefined ? {} : { parking: filters.parking }),
  ...(filters.availableBy === undefined ? {} : { availableBy: filters.availableBy }),
  ...(filters.q === undefined ? {} : { q: filters.q }),
});

/** Back into the page's filters (to open the search's results). */
export const fromCriteria = (criteria: SavedSearchCriteria): SearchFilters => toCriteria(criteria);
