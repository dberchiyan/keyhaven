import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { type ApiError, isApiError } from '@/shared/api/api-error';
import { HTTP_STATUS } from '@/shared/api/http-status';
import { PATHS } from '@/shared/lib/paths';
import { MINUTE_MS } from '@/shared/lib/units';

import { authApi } from '../api/auth-api';
import type { CurrentUser } from '../types';
import { authKeys } from './query-keys';

const ME_STALE_MINUTES = 5;

/**
 * "Who am I" (NAV-3): `null` is the wire's "signed out", never a stored boolean. A dead session at
 * `/` reloads the page, because the server has just cleared its cookie and nginx then serves the
 * landing there (without a landing — local Vite — the reload simply lands on sign-in).
 */
export const useCurrentUser = (): UseQueryResult<CurrentUser | null, ApiError> =>
    useQuery<CurrentUser | null, ApiError>({
        queryKey: authKeys.me(),
        queryFn: async () => {
            try {
                return await authApi.me();
            } catch (error) {
                if (isApiError(error) && error.status === HTTP_STATUS.UNAUTHORIZED) {
                    if (error.code === 'SESSION_EXPIRED' && window.location.pathname === PATHS.home) {
                        window.location.replace(PATHS.home);
                        return new Promise<never>(() => undefined);
                    }
                    return null;
                }
                throw error;
            }
        },
        staleTime: ME_STALE_MINUTES * MINUTE_MS,
    });
