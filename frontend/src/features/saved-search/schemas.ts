import { z } from 'zod';

import { DEFAULT_KIND, fromApiKind, type SearchFilters, toApiKind } from '@/shared/lib/listing-search';

import type { SavedSearchCriteria } from './types';

/** Mirrors backend CreateSavedSearchRequestSchema (saved-search/controller/dto/saved-search.request.ts). */
export const SAVED_SEARCH_LIMITS = { name: 80 } as const;

export const saveSearchSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'validation:savedSearchName.required')
        .max(SAVED_SEARCH_LIMITS.name, 'validation:savedSearchName.tooLong'),
    hasEmailAlerts: z.boolean(),
});

export type SaveSearchValues = z.input<typeof saveSearchSchema>;
export type SaveSearchOutput = z.output<typeof saveSearchSchema>;

/**
 * The page's filters as the API's saved criteria: the same keys, only the defined ones, because
 * an explicit `undefined` would not survive `exactOptionalPropertyTypes`.
 */
export const toCriteria = (filters: SearchFilters): SavedSearchCriteria => ({
    kind: toApiKind(filters.kind),
    ...(filters.type === undefined ? {} : { type: filters.type }),
    ...(filters.city === undefined ? {} : { city: filters.city }),
    ...(filters.priceMin === undefined ? {} : { priceMin: filters.priceMin }),
    ...(filters.priceMax === undefined ? {} : { priceMax: filters.priceMax }),
    ...(filters.beds === undefined ? {} : { beds: filters.beds }),
    ...(filters.baths === undefined ? {} : { baths: filters.baths }),
    ...(filters.isPetFriendly === undefined ? {} : { isPetFriendly: filters.isPetFriendly }),
    ...(filters.isFurnished === undefined ? {} : { isFurnished: filters.isFurnished }),
    ...(filters.hasParking === undefined ? {} : { hasParking: filters.hasParking }),
    ...(filters.moveInAt === undefined ? {} : { moveInAt: filters.moveInAt }),
    ...(filters.q === undefined ? {} : { q: filters.q }),
});

/** Back into the page's filters, so a saved search opens its results on the catalogue page. */
export const fromCriteria = (criteria: SavedSearchCriteria): SearchFilters => ({
    kind: criteria.kind ? fromApiKind(criteria.kind) : DEFAULT_KIND,
    ...(criteria.type === undefined ? {} : { type: criteria.type }),
    ...(criteria.city === undefined ? {} : { city: criteria.city }),
    ...(criteria.priceMin === undefined ? {} : { priceMin: criteria.priceMin }),
    ...(criteria.priceMax === undefined ? {} : { priceMax: criteria.priceMax }),
    ...(criteria.beds === undefined ? {} : { beds: criteria.beds }),
    ...(criteria.baths === undefined ? {} : { baths: criteria.baths }),
    ...(criteria.isPetFriendly === undefined ? {} : { isPetFriendly: criteria.isPetFriendly }),
    ...(criteria.isFurnished === undefined ? {} : { isFurnished: criteria.isFurnished }),
    ...(criteria.hasParking === undefined ? {} : { hasParking: criteria.hasParking }),
    ...(criteria.moveInAt === undefined ? {} : { moveInAt: criteria.moveInAt }),
    ...(criteria.q === undefined ? {} : { q: criteria.q }),
});
