import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/shared/api/api-error';

import { authApi } from '../api/auth-api';
import type { CurrentUser, LoginRequest } from '../types';
import { authKeys } from './query-keys';

/**
 * Signs in and seeds `/auth/me` with the answer; every other query is read again, because what was
 * browsed signed out (hearts, addresses) differs for the person.
 */
export const useLogin = (): UseMutationResult<CurrentUser, ApiError, LoginRequest> => {
    const queryClient = useQueryClient();
    return useMutation<CurrentUser, ApiError, LoginRequest>({
        mutationFn: authApi.login,
        onSuccess: async (user) => {
            queryClient.setQueryData(authKeys.me(), user);
            await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
        },
    });
};
