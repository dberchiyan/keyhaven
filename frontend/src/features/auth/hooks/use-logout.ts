import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/shared/api/api-error';
import { PATHS } from '@/shared/lib/paths';

import { authApi } from '../api/auth-api';

/**
 * Clears the cache whatever the answer (NAV-3), then loads `/` in full: without the session cookie
 * nginx serves the landing there (local Vite has none and shows sign-in).
 */
export const useLogout = (): UseMutationResult<unknown, ApiError, void> => {
    const queryClient = useQueryClient();
    return useMutation<unknown, ApiError>({
        mutationFn: authApi.logout,
        onSettled: () => {
            queryClient.clear();
            window.location.replace(PATHS.home);
        },
    });
};
