import type { BrowseParams, ManagedListParams } from '../types';

/** The caller comes from the session; the cache is cleared on sign-out. */
export const listingKeys = {
  all: ['listings'] as const,
  cities: () => [...listingKeys.all, 'cities'] as const,
  searches: () => [...listingKeys.all, 'search'] as const,
  search: (params: BrowseParams) => [...listingKeys.searches(), params] as const,
  detail: (listingId: string) => [...listingKeys.all, 'detail', listingId] as const,
  managed: () => [...listingKeys.all, 'managed'] as const,
  managedLists: () => [...listingKeys.managed(), 'list'] as const,
  managedList: (params: ManagedListParams) => [...listingKeys.managedLists(), params] as const,
  managedCounts: () => [...listingKeys.managed(), 'counts'] as const,
  managedDetail: (listingId: string) => [...listingKeys.managed(), 'detail', listingId] as const,
};
