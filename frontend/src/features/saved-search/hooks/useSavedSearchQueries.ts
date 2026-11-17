import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api/apiError';
import { savedSearchApi } from '../api/savedSearchApi';
import type { CreateSavedSearchRequest, SavedSearch, UpdateSavedSearchRequest } from '../types';
import { savedSearchKeys } from './queryKeys';

export const useSavedSearches = () => useQuery({ queryKey: savedSearchKeys.list(), queryFn: savedSearchApi.list });

const useInvalidate = () => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: savedSearchKeys.all });
};

export const useCreateSavedSearch = () => {
    const invalidate = useInvalidate();
    return useMutation<SavedSearch, ApiError, { request: CreateSavedSearchRequest; key: string }>({
        mutationFn: ({ request, key }) => savedSearchApi.create(request, key),
        onSuccess: invalidate,
    });
};

/** A 409 (edited elsewhere) reads the list again in `onSettled`, so the next edit starts fresh. */
export const useUpdateSavedSearch = () => {
    const invalidate = useInvalidate();
    return useMutation<SavedSearch, ApiError, { id: string; request: UpdateSavedSearchRequest }>({
        mutationFn: ({ id, request }) => savedSearchApi.update(id, request),
        onSuccess: invalidate,
        onSettled: async (_data, error) => {
            if (error?.code === 'CONCURRENT_MODIFICATION') {
                await invalidate();
            }
        },
    });
};

export const useDeleteSavedSearch = () => {
    const invalidate = useInvalidate();
    return useMutation<unknown, ApiError, string>({
        mutationFn: (id) => savedSearchApi.remove(id),
        onSuccess: invalidate,
    });
};
