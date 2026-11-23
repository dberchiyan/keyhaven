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

import { viewingApi } from '../api/viewing-api';
import type {
    ManagedViewingsParams,
    RequestViewingRequest,
    SaveViewingScheduleRequest,
    Viewing,
    ViewingDecision,
    ViewingPage,
    ViewingSchedule,
    ViewingScheduleState,
    ViewingSlots,
    ViewingSummary,
} from '../types';
import { viewingKeys } from './query-keys';

const SUMMARY_POLL_MS = MINUTE_MS;

export interface RequestViewingVariables {
    request: RequestViewingRequest;
    key: string;
}

export interface DecideViewingVariables {
    id: string;
    decision: ViewingDecision;
    note?: string;
}

export interface SaveScheduleVariables {
    listingId: string;
    request: SaveViewingScheduleRequest;
}

/** Slots go as others book them, so every opening reads them again (QRY-3 override, named here). */
export const useViewingSlots = (
    listingId: string,
    from: string | undefined,
    enabled = true,
): UseQueryResult<ViewingSlots, ApiError> =>
    useQuery<ViewingSlots, ApiError>({
        queryKey: viewingKeys.slots(listingId, from),
        queryFn: () => viewingApi.slots(listingId, from),
        placeholderData: keepPreviousData,
        staleTime: 0,
        refetchOnMount: 'always',
        enabled,
    });

/** A tenant's own viewings; off for everyone else, who has none to read. */
export const useOwnViewings = (enabled = true): UseQueryResult<Viewing[], ApiError> =>
    useQuery<Viewing[], ApiError>({ queryKey: viewingKeys.own(), queryFn: viewingApi.listOwn, enabled });

/** One page of the owner's dashboard; the previous page stays while the next loads (QRY-5). */
export const useManagedViewings = (params: ManagedViewingsParams): UseQueryResult<ViewingPage, ApiError> =>
    useQuery<ViewingPage, ApiError>({
        queryKey: viewingKeys.managedList(params),
        queryFn: () => viewingApi.managedPage(params),
        placeholderData: keepPreviousData,
    });

/** The sidebar's request badge: polled while the tab is visible (QRY-6), the live channel aside. */
export const useViewingSummary = (enabled = true): UseQueryResult<ViewingSummary, ApiError> =>
    useQuery<ViewingSummary, ApiError>({
        queryKey: viewingKeys.summary(),
        queryFn: viewingApi.summary,
        refetchInterval: SUMMARY_POLL_MS,
        refetchIntervalInBackground: false,
        enabled,
    });

/** The live viewings of one listing, for its management page. */
export const useListingViewings = (listingId: string): UseQueryResult<Viewing[], ApiError> =>
    useQuery<Viewing[], ApiError>({
        queryKey: viewingKeys.listing(listingId),
        queryFn: () => viewingApi.listForListing(listingId),
    });

/** A listing's viewing hours and its zone (the hours are local minutes of that zone). */
export const useViewingSchedule = (listingId: string, enabled = true): UseQueryResult<ViewingScheduleState, ApiError> =>
    useQuery<ViewingScheduleState, ApiError>({
        queryKey: viewingKeys.schedule(listingId),
        queryFn: () => viewingApi.schedule(listingId),
        enabled,
    });

/** Every viewing query: a decision changes the lists, the badge, the slots and the hours alike. */
const useInvalidateViewings = (): (() => Promise<void>) => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: viewingKeys.all });
};

/**
 * Never optimistic: a request holds a real slot and the answer may be "taken" (QRY-4); the slots
 * are read again either way.
 */
export const useRequestViewing = (): UseMutationResult<Viewing, ApiError, RequestViewingVariables> => {
    const invalidate = useInvalidateViewings();
    return useMutation<Viewing, ApiError, RequestViewingVariables>({
        mutationFn: ({ request, key }) => viewingApi.request(request, key),
        onSuccess: invalidate,
        onSettled: invalidate,
    });
};

/** A 409 (changed elsewhere) reads everything again, so the next try starts fresh (QRY-4). */
export const useDecideViewing = (): UseMutationResult<Viewing, ApiError, DecideViewingVariables> => {
    const invalidate = useInvalidateViewings();
    return useMutation<Viewing, ApiError, DecideViewingVariables>({
        mutationFn: ({ id, decision, note }) => {
            if (decision === 'confirm') {
                return viewingApi.confirm(id);
            }
            return decision === 'decline' ? viewingApi.decline(id, note) : viewingApi.cancel(id, note);
        },
        onSuccess: invalidate,
        onSettled: async (_data, error) => {
            if (error?.code === 'CONCURRENT_MODIFICATION') {
                await invalidate();
            }
        },
    });
};

/** Saves the hours as one document; a 409 reads them again so the editor reopens on the latest (QRY-4). */
export const useSaveSchedule = (): UseMutationResult<ViewingSchedule, ApiError, SaveScheduleVariables> => {
    const invalidate = useInvalidateViewings();
    return useMutation<ViewingSchedule, ApiError, SaveScheduleVariables>({
        mutationFn: ({ listingId, request }) => viewingApi.saveSchedule(listingId, request),
        onSuccess: invalidate,
        onSettled: async (_data, error) => {
            if (error?.code === 'CONCURRENT_MODIFICATION') {
                await invalidate();
            }
        },
    });
};

/** Closes the hours; the confirm dialog names the effect first (FORM-5). */
export const useRemoveSchedule = (): UseMutationResult<unknown, ApiError, string> => {
    const invalidate = useInvalidateViewings();
    return useMutation<unknown, ApiError, string>({
        mutationFn: (listingId) => viewingApi.removeSchedule(listingId),
        onSuccess: invalidate,
    });
};
