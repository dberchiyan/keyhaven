import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api/apiError';
import { viewingApi } from '../api/viewingApi';
import type {
  ManagedViewingsParams,
  RequestViewingRequest,
  SaveViewingScheduleRequest,
  Viewing,
  ViewingDecision,
  ViewingSchedule,
} from '../types';
import { viewingKeys } from './queryKeys';

/** The sidebar's badge polls for new requests while the tab is visible (no push channel). */
const SUMMARY_POLL_MS = 60_000;

export const useViewingSlots = (listingId: string, from: string | undefined, enabled = true) =>
  useQuery({
    queryKey: viewingKeys.slots(listingId, from),
    queryFn: () => viewingApi.slots(listingId, from),
    placeholderData: keepPreviousData,
    // Slots go as others book them: read again on every opening.
    staleTime: 0,
    refetchOnMount: 'always',
    enabled,
  });

export const useOwnViewings = (enabled = true) =>
  useQuery({ queryKey: viewingKeys.own(), queryFn: viewingApi.listOwn, enabled });

export const useManagedViewings = (params: ManagedViewingsParams) =>
  useQuery({
    queryKey: viewingKeys.managedList(params),
    queryFn: () => viewingApi.managedPage(params),
    placeholderData: keepPreviousData,
  });

export const useViewingSummary = (enabled = true) =>
  useQuery({
    queryKey: viewingKeys.summary(),
    queryFn: viewingApi.summary,
    refetchInterval: SUMMARY_POLL_MS,
    refetchIntervalInBackground: false,
    enabled,
  });

export const useListingViewings = (listingId: string) =>
  useQuery({
    queryKey: viewingKeys.listing(listingId),
    queryFn: () => viewingApi.listForListing(listingId),
  });

export const useViewingSchedule = (listingId: string, enabled = true) =>
  useQuery({
    queryKey: viewingKeys.schedule(listingId),
    queryFn: () => viewingApi.schedule(listingId),
    enabled,
  });

const useInvalidateViewings = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: viewingKeys.all });
};

/** Never optimistic: a request holds a real slot, and the answer may be "taken". */
export const useRequestViewing = () => {
  const invalidate = useInvalidateViewings();
  return useMutation<Viewing, ApiError, { request: RequestViewingRequest; key: string }>({
    mutationFn: ({ request, key }) => viewingApi.request(request, key),
    onSuccess: invalidate,
    // A taken slot or a stale offer: the slots are read again either way.
    onSettled: invalidate,
  });
};

/** A 409 (changed elsewhere) reads everything again in `onSettled`, so the next try starts fresh. */
export const useDecideViewing = () => {
  const invalidate = useInvalidateViewings();
  return useMutation<Viewing, ApiError, { id: string; decision: ViewingDecision; note?: string }>({
    mutationFn: ({ id, decision, note }) =>
      decision === 'confirm'
        ? viewingApi.confirm(id)
        : decision === 'decline'
          ? viewingApi.decline(id, note)
          : viewingApi.cancel(id, note),
    onSuccess: invalidate,
    onSettled: async (_data, error) => {
      if (error?.code === 'CONCURRENT_MODIFICATION') {
        await invalidate();
      }
    },
  });
};

export const useSaveSchedule = () => {
  const invalidate = useInvalidateViewings();
  return useMutation<
    ViewingSchedule,
    ApiError,
    { listingId: string; request: SaveViewingScheduleRequest }
  >({
    mutationFn: ({ listingId, request }) => viewingApi.saveSchedule(listingId, request),
    onSuccess: invalidate,
    onSettled: async (_data, error) => {
      if (error?.code === 'CONCURRENT_MODIFICATION') {
        await invalidate();
      }
    },
  });
};

export const useRemoveSchedule = () => {
  const invalidate = useInvalidateViewings();
  return useMutation<unknown, ApiError, string>({
    mutationFn: (listingId) => viewingApi.removeSchedule(listingId),
    onSuccess: invalidate,
  });
};
