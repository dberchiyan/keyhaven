import {
    keepPreviousData,
    type QueryKey,
    useMutation,
    type UseMutationResult,
    useQuery,
    useQueryClient,
    type UseQueryResult,
} from '@tanstack/react-query';

import type { ApiError } from '@/shared/api/api-error';
import { DEFAULT_BROWSE_SORT, type SearchFilters } from '@/shared/lib/listing-search';
import { MINUTE_MS } from '@/shared/lib/units';

import { listingApi } from '../api/listing-api';
import { savedListingApi } from '../api/saved-listing-api';
import { ListingPage as ListingPageView } from '../lazy-pages';
import type {
    BrowseParams,
    City,
    ListingCard,
    ListingDetail,
    ListingPage,
    SavedListParams,
    SignedInUser,
    ToggleSavedVariables,
} from '../types';
import { listingKeys } from './query-keys';

const CITIES_STALE_MINUTES = 10;
const PREFETCH_STALE_MS = MINUTE_MS;

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

/**
 * Hover or focus on a link to a home starts its page chunk and its data together, so the click
 * renders at once (QRY-7, PERF-1). A failed prefetch is left to the page, which shows its own error.
 */
export const usePrefetchListing = (): ((listingId: string) => void) => {
    const queryClient = useQueryClient();
    return (listingId: string): void => {
        void ListingPageView.preload();
        queryClient
            .query({
                queryKey: listingKeys.detail(listingId),
                queryFn: () => listingApi.find(listingId),
                staleTime: PREFETCH_STALE_MS,
            })
            .catch(() => undefined);
    };
};

/** A booking can reveal the address (a confirmed viewing), so the home is read again after one. */
export const useRefreshListing = (): ((listingId: string) => void) => {
    const queryClient = useQueryClient();
    return (listingId: string): void => {
        void queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) });
    };
};

type CachedQueries = [QueryKey, unknown][];

interface Hearted {
    id: string;
    isSaved: boolean;
}

const isHearted = (value: unknown): value is Hearted =>
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'isSaved' in value &&
    typeof value.id === 'string' &&
    typeof value.isSaved === 'boolean';

/**
 * The same home may sit in several cached queries at once (a search page, the strips, the
 * detail, the saved list): every one of them gets the new heart, whatever its shape.
 */
const withHeart = (data: unknown, listingId: string, saved: boolean): unknown => {
    if (Array.isArray(data)) {
        return data.map((item) => withHeart(item, listingId, saved));
    }
    if (isHearted(data)) {
        return data.id === listingId ? { ...data, isSaved: saved } : data;
    }
    if (typeof data === 'object' && data !== null && 'content' in data) {
        return { ...data, content: withHeart(data.content, listingId, saved) };
    }
    return data;
};

/**
 * Optimistic, because a save is reversible (QRY-4): every cached heart of the home flips at once
 * and flips back on an error; only the saved list is read again afterwards (its membership
 * changed).
 */
export const useToggleSaved = (): UseMutationResult<unknown, ApiError, ToggleSavedVariables, CachedQueries> => {
    const queryClient = useQueryClient();
    return useMutation<unknown, ApiError, ToggleSavedVariables, CachedQueries>({
        mutationFn: ({ listingId, saved }) =>
            saved ? savedListingApi.unsave(listingId) : savedListingApi.save(listingId),
        onMutate: async ({ listingId, saved }) => {
            await queryClient.cancelQueries({ queryKey: listingKeys.all });
            const before = queryClient.getQueriesData({ queryKey: listingKeys.all });
            queryClient.setQueriesData({ queryKey: listingKeys.all }, (data: unknown) =>
                withHeart(data, listingId, !saved),
            );
            return before;
        },
        onError: (_error, _variables, context) => {
            for (const [key, data] of context ?? []) {
                queryClient.setQueryData(key, data);
            }
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: listingKeys.saved() });
        },
    });
};
