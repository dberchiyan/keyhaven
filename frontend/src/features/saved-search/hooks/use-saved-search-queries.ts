import {
    useMutation,
    type UseMutationResult,
    useQuery,
    useQueryClient,
    type UseQueryResult,
} from '@tanstack/react-query';

import type { ApiError } from '@/shared/api/api-error';

import { savedSearchApi } from '../api/saved-search-api';
import type { CreateSavedSearchVariables, SavedSearch, UpdateSavedSearchVariables } from '../types';
import { savedSearchKeys } from './query-keys';

/** The tenant's saved searches; capped at 20 by the server, so one unpaged list. */
export const useSavedSearches = (): UseQueryResult<SavedSearch[], ApiError> =>
    useQuery<SavedSearch[], ApiError>({ queryKey: savedSearchKeys.list(), queryFn: savedSearchApi.list });

/** Every change re-reads the list: it is the narrowest key that holds a search (QRY-4). */
const useInvalidate = (): (() => Promise<void>) => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: savedSearchKeys.all });
};

/** One Idempotency-Key per dialog opening travels in the variables (QRY-12). */
export const useCreateSavedSearch = (): UseMutationResult<SavedSearch, ApiError, CreateSavedSearchVariables> => {
    const invalidate = useInvalidate();
    return useMutation<SavedSearch, ApiError, CreateSavedSearchVariables>({
        mutationFn: ({ request, key }) => savedSearchApi.create(request, key),
        onSuccess: invalidate,
    });
};

/** A 409 (edited elsewhere) reads the list again, so the next edit starts from the fresh version (QRY-4). */
export const useUpdateSavedSearch = (): UseMutationResult<SavedSearch, ApiError, UpdateSavedSearchVariables> => {
    const invalidate = useInvalidate();
    return useMutation<SavedSearch, ApiError, UpdateSavedSearchVariables>({
        mutationFn: ({ id, request }) => savedSearchApi.update(id, request),
        onSuccess: invalidate,
        onSettled: async (_data, error) => {
            if (error?.code === 'CONCURRENT_MODIFICATION') {
                await invalidate();
            }
        },
    });
};

/** Not optimistic: deleting is irreversible (QRY-4). */
export const useDeleteSavedSearch = (): UseMutationResult<unknown, ApiError, string> => {
    const invalidate = useInvalidate();
    return useMutation<unknown, ApiError, string>({
        mutationFn: (id) => savedSearchApi.remove(id),
        onSuccess: invalidate,
    });
};
