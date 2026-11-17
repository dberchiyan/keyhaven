import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ApiError } from '@/shared/api/api-error';
import { DEFAULT_BROWSE_SORT, type SearchFilters } from '@/shared/lib/listing-search';
import { MINUTE_MS } from '@/shared/lib/units';

import { listingApi } from '../api/listing-api';
import { managedListingApi } from '../api/managed-listing-api';
import { savedListingApi } from '../api/saved-listing-api';
import type {
    BrowseParams,
    City,
    InsightPeriod,
    ListingCard,
    ListingDetail,
    ListingInsights,
    ListingPage,
    ListingStatusCounts,
    ManagedInsights,
    ManagedListing,
    ManagedListingPage,
    ManagedListParams,
    SavedListParams,
    SignedInUser,
} from '../types';
import { listingKeys } from './query-keys';

const CITIES_STALE_MINUTES = 10;

/** Reference data: the cities change with a release, not during a visit, so they stay fresh longer (QRY-3). */
export const useCities = (): UseQueryResult<City[], ApiError> =>
    useQuery<City[], ApiError>({
        queryKey: listingKeys.cities(),
        queryFn: listingApi.cities,
        staleTime: CITIES_STALE_MINUTES * MINUTE_MS,
    });

/** Another page keeps the previous cards on screen until the new ones arrive (QRY-5). */
export const useListings = (params: BrowseParams): UseQueryResult<ListingPage, ApiError> =>
    useQuery<ListingPage, ApiError>({
        queryKey: listingKeys.search(params),
        queryFn: () => listingApi.search(params),
        placeholderData: keepPreviousData,
    });

/**
 * How many homes a set of filters would show — the filter drawer's "Show N homes" button. One
 * card is enough: the API answers the total with every page.
 */
export const useListingCount = (filters: SearchFilters, enabled: boolean): UseQueryResult<number, ApiError> =>
    useQuery<ListingPage, ApiError, number>({
        queryKey: listingKeys.count(filters),
        queryFn: () => listingApi.search({ ...filters, sort: DEFAULT_BROWSE_SORT, page: 1, size: 1 }),
        select: (page) => page.totalElements,
        placeholderData: keepPreviousData,
        enabled,
    });

export const useSimilarListings = (listingId: string): UseQueryResult<ListingCard[], ApiError> =>
    useQuery<ListingCard[], ApiError>({
        queryKey: listingKeys.similar(listingId),
        queryFn: () => listingApi.similar(listingId),
    });

/**
 * Recently viewed: a signed-in person's come from the server (their view rows); a visitor's from
 * the ids their browser kept. `enabled` waits for "who am I" (`undefined` while it loads, `null`
 * signed out — NAV-3) and skips an empty list.
 */
export const useRecentlyViewed = (
    user: SignedInUser,
    localIds: readonly string[],
): UseQueryResult<ListingCard[], ApiError> =>
    useQuery<ListingCard[], ApiError>({
        queryKey: user ? listingKeys.recent() : listingKeys.cards(localIds),
        queryFn: () => (user ? listingApi.recent() : listingApi.cards(localIds)),
        enabled: user !== undefined && (user !== null || localIds.length > 0),
    });

export const useListing = (listingId: string): UseQueryResult<ListingDetail, ApiError> =>
    useQuery<ListingDetail, ApiError>({
        queryKey: listingKeys.detail(listingId),
        queryFn: () => listingApi.find(listingId),
    });

export const useSavedListings = (params: SavedListParams): UseQueryResult<ListingPage, ApiError> =>
    useQuery<ListingPage, ApiError>({
        queryKey: listingKeys.savedList(params),
        queryFn: () => savedListingApi.list(params),
        placeholderData: keepPreviousData,
    });

export const useManagedListings = (params: ManagedListParams): UseQueryResult<ManagedListingPage, ApiError> =>
    useQuery<ManagedListingPage, ApiError>({
        queryKey: listingKeys.managedList(params),
        queryFn: () => managedListingApi.list(params),
        placeholderData: keepPreviousData,
    });

export const useManagedListingCounts = (): UseQueryResult<ListingStatusCounts, ApiError> =>
    useQuery<ListingStatusCounts, ApiError>({
        queryKey: listingKeys.managedCounts(),
        queryFn: managedListingApi.statusCounts,
    });

/** Another period keeps the previous chart on screen until the new one arrives (QRY-5). */
export const useManagedInsights = (period: InsightPeriod): UseQueryResult<ManagedInsights, ApiError> =>
    useQuery<ManagedInsights, ApiError>({
        queryKey: listingKeys.managedInsights(period),
        queryFn: () => managedListingApi.insights(period),
        placeholderData: keepPreviousData,
    });

export const useListingInsights = (
    listingId: string,
    period: InsightPeriod,
): UseQueryResult<ListingInsights, ApiError> =>
    useQuery<ListingInsights, ApiError>({
        queryKey: listingKeys.managedListingInsights(listingId, period),
        queryFn: () => managedListingApi.listingInsights(listingId, period),
        placeholderData: keepPreviousData,
    });

/** No request without an id: the editor mounts for `/manage/new` with none. */
export const useManagedListing = (listingId: string): UseQueryResult<ManagedListing, ApiError> =>
    useQuery<ManagedListing, ApiError>({
        queryKey: listingKeys.managedDetail(listingId),
        queryFn: () => managedListingApi.find(listingId),
        enabled: listingId !== '',
    });
