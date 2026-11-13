import {
  DEFAULT_KIND,
  fromApiKind,
  type SearchFilters,
  toApiKind,
} from '@/shared/lib/listingSearch';
import type { SavedSearchCriteria } from './types';

/** The page's filters as the API's saved criteria — the same keys, only the defined ones. */
export const toCriteria = (filters: SearchFilters): SavedSearchCriteria => ({
  kind: toApiKind(filters.kind),
  ...(filters.type === undefined ? {} : { type: filters.type }),
  ...(filters.city === undefined ? {} : { city: filters.city }),
  ...(filters.priceMin === undefined ? {} : { priceMin: filters.priceMin }),
  ...(filters.priceMax === undefined ? {} : { priceMax: filters.priceMax }),
  ...(filters.beds === undefined ? {} : { beds: filters.beds }),
  ...(filters.baths === undefined ? {} : { baths: filters.baths }),
  ...(filters.pets === undefined ? {} : { pets: filters.pets }),
  ...(filters.furnished === undefined ? {} : { furnished: filters.furnished }),
  ...(filters.parking === undefined ? {} : { parking: filters.parking }),
  ...(filters.availableBy === undefined ? {} : { availableBy: filters.availableBy }),
  ...(filters.q === undefined ? {} : { q: filters.q }),
});

/** Back into the page's filters (to open the search's results). */
export const fromCriteria = (criteria: SavedSearchCriteria): SearchFilters => ({
  kind: criteria.kind ? fromApiKind(criteria.kind) : DEFAULT_KIND,
  ...(criteria.type === undefined ? {} : { type: criteria.type }),
  ...(criteria.city === undefined ? {} : { city: criteria.city }),
  ...(criteria.priceMin === undefined ? {} : { priceMin: criteria.priceMin }),
  ...(criteria.priceMax === undefined ? {} : { priceMax: criteria.priceMax }),
  ...(criteria.beds === undefined ? {} : { beds: criteria.beds }),
  ...(criteria.baths === undefined ? {} : { baths: criteria.baths }),
  ...(criteria.pets === undefined ? {} : { pets: criteria.pets }),
  ...(criteria.furnished === undefined ? {} : { furnished: criteria.furnished }),
  ...(criteria.parking === undefined ? {} : { parking: criteria.parking }),
  ...(criteria.availableBy === undefined ? {} : { availableBy: criteria.availableBy }),
  ...(criteria.q === undefined ? {} : { q: criteria.q }),
});
