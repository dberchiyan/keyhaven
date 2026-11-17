import type { SearchFilters } from '@/shared/lib/listingSearch';
import type { BrowseParams, InsightPeriod, ManagedListParams, SavedListParams } from '../types';

/** The caller comes from the session; the cache is cleared on sign-out. */
export const listingKeys = {
    all: ['listings'] as const,
    cities: () => [...listingKeys.all, 'cities'] as const,
    searches: () => [...listingKeys.all, 'search'] as const,
    search: (params: BrowseParams) => [...listingKeys.searches(), params] as const,
    count: (filters: SearchFilters) => [...listingKeys.searches(), 'count', filters] as const,
    detail: (listingId: string) => [...listingKeys.all, 'detail', listingId] as const,
    similar: (listingId: string) => [...listingKeys.all, 'similar', listingId] as const,
    recent: () => [...listingKeys.all, 'recent'] as const,
    cards: (ids: readonly string[]) => [...listingKeys.all, 'cards', ...ids] as const,
    saved: () => [...listingKeys.all, 'saved'] as const,
    savedList: (params: SavedListParams) => [...listingKeys.saved(), params] as const,
    managed: () => [...listingKeys.all, 'managed'] as const,
    managedLists: () => [...listingKeys.managed(), 'list'] as const,
    managedList: (params: ManagedListParams) => [...listingKeys.managedLists(), params] as const,
    managedCounts: () => [...listingKeys.managed(), 'counts'] as const,
    managedDetail: (listingId: string) => [...listingKeys.managed(), 'detail', listingId] as const,
    managedInsights: (period: InsightPeriod) => [...listingKeys.managed(), 'insights', period] as const,
    managedListingInsights: (listingId: string, period: InsightPeriod) =>
        [...listingKeys.managed(), 'detail', listingId, 'insights', period] as const,
};
