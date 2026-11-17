import { type QueryKey, useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/shared/api/api-error';

import { managedListingApi } from '../api/managed-listing-api';
import { savedListingApi } from '../api/saved-listing-api';
import type {
    CreateListingVariables,
    ListingTransition,
    ManagedListing,
    PhotoIntent,
    PhotoIntentVariables,
    ToggleSavedVariables,
    UpdateListingRequest,
} from '../types';
import { listingKeys } from './query-keys';

type CachedQueries = [QueryKey, unknown][];

interface Hearted {
    id: string;
    saved: boolean;
}

const isHearted = (value: unknown): value is Hearted =>
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'saved' in value &&
    typeof value.id === 'string' &&
    typeof value.saved === 'boolean';

/**
 * The same home may sit in several cached queries at once (a search page, the strips, the
 * detail, the saved list): every one of them gets the new heart, whatever its shape.
 */
const withHeart = (data: unknown, listingId: string, saved: boolean): unknown => {
    if (Array.isArray(data)) {
        return data.map((item) => withHeart(item, listingId, saved));
    }
    if (isHearted(data)) {
        return data.id === listingId ? { ...data, saved } : data;
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
