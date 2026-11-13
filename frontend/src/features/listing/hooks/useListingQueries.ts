import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api/apiError';
import { listingApi } from '../api/listingApi';
import { managedListingApi } from '../api/managedListingApi';
import type { BrowseParams, ListingTransition, ManagedListing, ManagedListParams } from '../types';
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

export const useListing = (listingId: string) =>
  useQuery({ queryKey: listingKeys.detail(listingId), queryFn: () => listingApi.find(listingId) });

export const useManagedListings = (params: ManagedListParams) =>
  useQuery({
    queryKey: listingKeys.managedList(params),
    queryFn: () => managedListingApi.list(params),
    placeholderData: keepPreviousData,
  });

export const useManagedListingCounts = () =>
  useQuery({ queryKey: listingKeys.managedCounts(), queryFn: managedListingApi.statusCounts });

export const useManagedListing = (listingId: string) =>
  useQuery({
    queryKey: listingKeys.managedDetail(listingId),
    queryFn: () => managedListingApi.find(listingId),
  });

/**
 * A status change. Not optimistic (publishing is visible to everyone at once); on success the
 * answer replaces the cached listing and the lists, counts and the public view are read again.
 */
const useTransition = (listingId: string, transition: ListingTransition) => {
  const queryClient = useQueryClient();
  return useMutation<ManagedListing, ApiError>({
    mutationFn: () => managedListingApi.transition(listingId, transition),
    onSuccess: async (listing) => {
      queryClient.setQueryData(listingKeys.managedDetail(listingId), listing);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingKeys.managedLists() }),
        queryClient.invalidateQueries({ queryKey: listingKeys.managedCounts() }),
        queryClient.invalidateQueries({ queryKey: listingKeys.searches() }),
        queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) }),
      ]);
    },
  });
};

export const usePublishListing = (listingId: string) => useTransition(listingId, 'publish');
export const useUnpublishListing = (listingId: string) => useTransition(listingId, 'unpublish');
export const useSuspendListing = (listingId: string) => useTransition(listingId, 'suspend');
