import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api/apiError';
import { DEFAULT_BROWSE_SORT, type SearchFilters } from '@/shared/lib/listingSearch';
import { listingApi } from '../api/listingApi';
import { managedListingApi } from '../api/managedListingApi';
import { savedListingApi } from '../api/savedListingApi';
import type {
  BrowseParams,
  CreateListingRequest,
  ListingTransition,
  ManagedListing,
  ManagedListParams,
  PhotoIntent,
  PhotoIntentRequest,
  SavedListParams,
  UpdateListingRequest,
} from '../types';
import { listingKeys } from './queryKeys';

/** Reference data: the six cities change with a release, not during a visit. */
const CITIES_STALE_MS = 10 * 60_000;

export const useCities = () =>
  useQuery({
    queryKey: listingKeys.cities(),
    queryFn: listingApi.cities,
    staleTime: CITIES_STALE_MS,
  });

/** Another page keeps the previous cards on screen until the new ones arrive. */
export const useListings = (params: BrowseParams) =>
  useQuery({
    queryKey: listingKeys.search(params),
    queryFn: () => listingApi.search(params),
    placeholderData: keepPreviousData,
  });

/**
 * How many homes a set of filters would show — the filter drawer's "Show N homes" button. One
 * card is enough: the API answers the total with every page.
 */
export const useListingCount = (filters: SearchFilters, enabled: boolean) =>
  useQuery({
    queryKey: listingKeys.count(filters),
    queryFn: () => listingApi.search({ ...filters, sort: DEFAULT_BROWSE_SORT, page: 1, size: 1 }),
    select: (page) => page.totalElements,
    placeholderData: keepPreviousData,
    enabled,
  });

export const useSimilarListings = (listingId: string) =>
  useQuery({
    queryKey: listingKeys.similar(listingId),
    queryFn: () => listingApi.similar(listingId),
  });

/**
 * Recently viewed: a signed-in person's come from the server (their view rows); a visitor's from
 * the ids their browser kept. `enabled` waits for "who am I" and skips an empty list.
 */
export const useRecentlyViewed = (
  user: { id: string } | null | undefined,
  localIds: readonly string[],
) =>
  useQuery({
    queryKey: user ? listingKeys.recent() : listingKeys.cards(localIds),
    queryFn: () => (user ? listingApi.recent() : listingApi.cards(localIds)),
    enabled: user !== undefined && (user !== null || localIds.length > 0),
  });

export const useListing = (listingId: string) =>
  useQuery({ queryKey: listingKeys.detail(listingId), queryFn: () => listingApi.find(listingId) });

export const useSavedListings = (params: SavedListParams) =>
  useQuery({
    queryKey: listingKeys.savedList(params),
    queryFn: () => savedListingApi.list(params),
    placeholderData: keepPreviousData,
  });

/**
 * Save or unsave a home. Reversible, so it is not optimistic either way: the heart flips when
 * the server answered, and every list that shows the heart is read again.
 */
export const useToggleSaved = () => {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, { listingId: string; saved: boolean }>({
    mutationFn: ({ listingId, saved }) =>
      saved ? savedListingApi.unsave(listingId) : savedListingApi.save(listingId),
    onSuccess: async (_result, { listingId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingKeys.searches() }),
        queryClient.invalidateQueries({ queryKey: listingKeys.saved() }),
        queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) }),
      ]);
    },
  });
};

export const useManagedListings = (params: ManagedListParams) =>
  useQuery({
    queryKey: listingKeys.managedList(params),
    queryFn: () => managedListingApi.list(params),
    placeholderData: keepPreviousData,
  });

export const useManagedListingCounts = () =>
  useQuery({ queryKey: listingKeys.managedCounts(), queryFn: managedListingApi.statusCounts });

/** No request without an id: the editor mounts for `/manage/new` with none. */
export const useManagedListing = (listingId: string) =>
  useQuery({
    queryKey: listingKeys.managedDetail(listingId),
    queryFn: () => managedListingApi.find(listingId),
    enabled: listingId !== '',
  });

/** The answer of any owner action replaces the cached listing; lists and counts are read again. */
const useManagedResult = () => {
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

/** Not optimistic: creating is visible to colleagues (an agency) at once. */
export const useCreateListing = () => {
  const settle = useManagedResult();
  return useMutation<ManagedListing, ApiError, { request: CreateListingRequest; key: string }>({
    mutationFn: ({ request, key }) => managedListingApi.create(request, key),
    onSuccess: settle,
  });
};

/** Not optimistic; a 409 (someone else saved first) reads the listing again in `onSettled`. */
export const useUpdateListing = (listingId: string) => {
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

/** A status change — publishing is visible to everyone at once, so never optimistic. */
const useTransition = (listingId: string, transition: ListingTransition) => {
  const settle = useManagedResult();
  return useMutation<ManagedListing, ApiError>({
    mutationFn: () => managedListingApi.transition(listingId, transition),
    onSuccess: settle,
  });
};

export const usePublishListing = (listingId: string) => useTransition(listingId, 'publish');
export const useUnpublishListing = (listingId: string) => useTransition(listingId, 'unpublish');
export const useSuspendListing = (listingId: string) => useTransition(listingId, 'suspend');

export const usePhotoIntent = (listingId: string) =>
  useMutation<PhotoIntent, ApiError, { request: PhotoIntentRequest; key: string }>({
    mutationFn: ({ request, key }) => managedListingApi.createPhotoIntent(listingId, request, key),
  });

export const useConfirmPhoto = (listingId: string) => {
  const settle = useManagedResult();
  return useMutation<ManagedListing, ApiError, string>({
    mutationFn: (photoId) => managedListingApi.confirmPhoto(listingId, photoId),
    onSuccess: settle,
  });
};

export const useReorderPhotos = (listingId: string) => {
  const settle = useManagedResult();
  return useMutation<ManagedListing, ApiError, string[]>({
    mutationFn: (photoIds) => managedListingApi.reorderPhotos(listingId, photoIds),
    onSuccess: settle,
  });
};

export const useRemovePhoto = (listingId: string) => {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: (photoId) => managedListingApi.removePhoto(listingId, photoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: listingKeys.managedDetail(listingId) });
    },
  });
};
