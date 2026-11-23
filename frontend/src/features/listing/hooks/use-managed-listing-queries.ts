import {
    keepPreviousData,
    useMutation,
    type UseMutationResult,
    useQuery,
    useQueryClient,
    type UseQueryResult,
} from '@tanstack/react-query';

import type { ApiError } from '@/shared/api/api-error';
import { MINUTE_MS } from '@/shared/lib/units';

import { managedListingApi } from '../api/managed-listing-api';
import { ManagedListingPage as ManagedListingPageView } from '../lazy-pages';
import type {
    CreateListingVariables,
    InsightPeriod,
    ListingInsights,
    ListingStatusCounts,
    ListingTransition,
    ManagedInsights,
    ManagedListing,
    ManagedListingPage,
    ManagedListParams,
    PhotoIntent,
    PhotoIntentVariables,
    UpdateListingRequest,
} from '../types';
import { listingKeys } from './query-keys';

const PREFETCH_STALE_MS = MINUTE_MS;

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

/** Hover or focus on a dashboard row starts the management page and its listing together (QRY-7, PERF-1). */
export const usePrefetchManagedListing = (): ((listingId: string) => void) => {
    const queryClient = useQueryClient();
    return (listingId: string): void => {
        void ManagedListingPageView.preload();
        queryClient
            .query({
                queryKey: listingKeys.managedDetail(listingId),
                queryFn: () => managedListingApi.find(listingId),
                staleTime: PREFETCH_STALE_MS,
            })
            .catch(() => undefined);
    };
};

/** The answer of any owner action replaces the cached listing; lists and counts are read again (QRY-4). */
const useManagedResult = (): ((listing: ManagedListing) => Promise<void>) => {
    const queryClient = useQueryClient();
    return async (listing: ManagedListing): Promise<void> => {
        queryClient.setQueryData(listingKeys.managedDetail(listing.id), listing);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: listingKeys.managedLists() }),
            queryClient.invalidateQueries({ queryKey: listingKeys.managedCounts() }),
            queryClient.invalidateQueries({ queryKey: listingKeys.searches() }),
            queryClient.invalidateQueries({ queryKey: listingKeys.detail(listing.id) }),
        ]);
    };
};

/** Not optimistic: a new listing is visible to colleagues (an agency) at once. */
export const useCreateListing = (): UseMutationResult<ManagedListing, ApiError, CreateListingVariables> => {
    const settle = useManagedResult();
    return useMutation<ManagedListing, ApiError, CreateListingVariables>({
        mutationFn: ({ request, key }) => managedListingApi.create(request, key),
        onSuccess: settle,
    });
};

/** Not optimistic; a 409 (someone else saved first) reads the listing again, so the next edit starts fresh (QRY-4). */
export const useUpdateListing = (
    listingId: string,
): UseMutationResult<ManagedListing, ApiError, UpdateListingRequest> => {
    const queryClient = useQueryClient();
    const settle = useManagedResult();
    return useMutation<ManagedListing, ApiError, UpdateListingRequest>({
        mutationFn: (request) => managedListingApi.update(listingId, request),
        onSuccess: settle,
        onSettled: async (_data, error) => {
            if (error?.code === 'CONCURRENT_MODIFICATION') {
                await queryClient.invalidateQueries({ queryKey: listingKeys.managedDetail(listingId) });
            }
        },
    });
};

/** A status change is visible to everyone at once, so it is never optimistic (QRY-4). */
const useTransition = (
    listingId: string,
    transition: ListingTransition,
): UseMutationResult<ManagedListing, ApiError, void> => {
    const settle = useManagedResult();
    return useMutation<ManagedListing, ApiError>({
        mutationFn: () => managedListingApi.transition(listingId, transition),
        onSuccess: settle,
    });
};

export const usePublishListing = (listingId: string): UseMutationResult<ManagedListing, ApiError, void> =>
    useTransition(listingId, 'publish');
export const useUnpublishListing = (listingId: string): UseMutationResult<ManagedListing, ApiError, void> =>
    useTransition(listingId, 'unpublish');
export const useSuspendListing = (listingId: string): UseMutationResult<ManagedListing, ApiError, void> =>
    useTransition(listingId, 'suspend');

export const usePhotoIntent = (listingId: string): UseMutationResult<PhotoIntent, ApiError, PhotoIntentVariables> =>
    useMutation<PhotoIntent, ApiError, PhotoIntentVariables>({
        mutationFn: ({ request, key }) => managedListingApi.createPhotoIntent(listingId, request, key),
    });

export const useConfirmPhoto = (listingId: string): UseMutationResult<ManagedListing, ApiError, string> => {
    const settle = useManagedResult();
    return useMutation<ManagedListing, ApiError, string>({
        mutationFn: (photoId) => managedListingApi.confirmPhoto(listingId, photoId),
        onSuccess: settle,
    });
};

export const useReorderPhotos = (listingId: string): UseMutationResult<ManagedListing, ApiError, string[]> => {
    const settle = useManagedResult();
    return useMutation<ManagedListing, ApiError, string[]>({
        mutationFn: (photoIds) => managedListingApi.reorderPhotos(listingId, photoIds),
        onSuccess: settle,
    });
};

export const useRemovePhoto = (listingId: string): UseMutationResult<unknown, ApiError, string> => {
    const queryClient = useQueryClient();
    return useMutation<unknown, ApiError, string>({
        mutationFn: (photoId) => managedListingApi.removePhoto(listingId, photoId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: listingKeys.managedDetail(listingId) });
        },
    });
};
