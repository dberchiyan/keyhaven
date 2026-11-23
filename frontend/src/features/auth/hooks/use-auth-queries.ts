import {
    type InfiniteData,
    keepPreviousData,
    useInfiniteQuery,
    type UseInfiniteQueryResult,
    useMutation,
    type UseMutationResult,
    useQuery,
    useQueryClient,
    type UseQueryResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { type ApiError, isApiError } from '@/shared/api/api-error';
import { HTTP_STATUS } from '@/shared/api/http-status';
import { PATHS } from '@/shared/lib/paths';
import { MINUTE_MS } from '@/shared/lib/units';

import { accountApi } from '../api/account-api';
import { authApi } from '../api/auth-api';
import type {
    ChangePasswordRequest,
    CurrentUser,
    EmailVerification,
    LoginRequest,
    PasswordResetRequestRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SecurityCategory,
    SecurityLog,
    UpdateOwnNameRequest,
    UserSessions,
    VerifyEmailRequest,
} from '../types';
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

/**
 * Creates an account. The answer signs the person in, so everything cached for the visitor
 * ("not signed in") is dropped and the app loads afresh as them.
 */
export const useRegister = (): UseMutationResult<CurrentUser, ApiError, RegisterRequest> => {
    const queryClient = useQueryClient();
    return useMutation<CurrentUser, ApiError, RegisterRequest>({
        mutationFn: authApi.register,
        onSuccess: () => {
            queryClient.clear();
        },
    });
};

/** The link from the verification email; the signed-in user (if any) is re-read afterwards. */
export const useVerifyEmail = (): UseMutationResult<EmailVerification, ApiError, VerifyEmailRequest> => {
    const queryClient = useQueryClient();
    return useMutation<EmailVerification, ApiError, VerifyEmailRequest>({
        mutationFn: authApi.verifyEmail,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: authKeys.me() });
        },
    });
};

/** A fresh verification link; the server rate-limits it, so the banner shows the error code as it comes. */
export const useResendVerification = (): UseMutationResult<unknown, ApiError, void> =>
    useMutation<unknown, ApiError>({ mutationFn: authApi.resendVerification });

/** "Forgot password": the answer never says whether the address has an account. */
export const useRequestPasswordReset = (): UseMutationResult<unknown, ApiError, PasswordResetRequestRequest> =>
    useMutation<unknown, ApiError, PasswordResetRequestRequest>({
        mutationFn: authApi.requestPasswordReset,
    });

/** A new password through the emailed link; the answer signs this browser in (cache dropped). */
export const useResetPassword = (): UseMutationResult<CurrentUser, ApiError, ResetPasswordRequest> => {
    const queryClient = useQueryClient();
    return useMutation<CurrentUser, ApiError, ResetPasswordRequest>({
        mutationFn: authApi.resetPassword,
        onSuccess: () => {
            queryClient.clear();
        },
    });
};

/** Another page keeps the previous rows on screen until the new ones arrive (QRY-5). */
export const useSessions = (page: number): UseQueryResult<UserSessions, ApiError> =>
    useQuery<UserSessions, ApiError>({
        queryKey: authKeys.sessionsPage(page),
        queryFn: () => accountApi.sessions(page),
        placeholderData: keepPreviousData,
    });

/**
 * The name shows across the app (account menu, people lists, requests, notices), so every query
 * on screen is read again — /auth/me first.
 */
export const useUpdateOwnName = (): UseMutationResult<unknown, ApiError, UpdateOwnNameRequest> => {
    const queryClient = useQueryClient();
    return useMutation<unknown, ApiError, UpdateOwnNameRequest>({
        mutationFn: accountApi.updateName,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authKeys.me() });
            void queryClient.invalidateQueries();
        },
    });
};

/** The server ends the other sessions on a password change, so the sessions list is read again (QRY-4). */
export const useChangePassword = (): UseMutationResult<unknown, ApiError, ChangePasswordRequest> => {
    const queryClient = useQueryClient();
    return useMutation<unknown, ApiError, ChangePasswordRequest>({
        mutationFn: accountApi.changePassword,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
        },
    });
};

/** Ends one other session; only the sessions list changes (QRY-4). */
export const useEndSession = (): UseMutationResult<unknown, ApiError, string> => {
    const queryClient = useQueryClient();
    return useMutation<unknown, ApiError, string>({
        mutationFn: accountApi.endSession,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
        },
    });
};

/** Ends every session but this browser's; only the sessions list changes (QRY-4). */
export const useEndOtherSessions = (): UseMutationResult<unknown, ApiError, void> => {
    const queryClient = useQueryClient();
    return useMutation<unknown, ApiError>({
        mutationFn: accountApi.endOtherSessions,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
        },
    });
};

/** Own security log by category, newest first; "Show more" follows the server's cursor (QRY-5, API-23). */
export const useOwnSecurityLog = (
    category: SecurityCategory | undefined,
): UseInfiniteQueryResult<InfiniteData<SecurityLog>, ApiError> =>
    useInfiniteQuery<
        SecurityLog,
        ApiError,
        InfiniteData<SecurityLog>,
        ReturnType<typeof authKeys.securityLog>,
        string | undefined
    >({
        queryKey: authKeys.securityLog(category),
        queryFn: ({ pageParam }) => accountApi.securityLog(category, pageParam),
        initialPageParam: undefined,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

/** "Stay signed in": re-reading `/auth/me` is a request, so the server counts the session as active again. */
export const useRefreshCurrentUser = (): (() => Promise<void>) => {
    const queryClient = useQueryClient();
    return async (): Promise<void> => {
        await queryClient.refetchQueries({ queryKey: authKeys.me() });
    };
};

/**
 * An idle session ended on the server: nothing cached for the person may stay on screen (NAV-3). The identity is
 * stable because the idle countdown's effect depends on it (PERF-5: a correctness reason, not a speed one).
 */
export const useClearSessionCache = (): (() => void) => {
    const queryClient = useQueryClient();
    return useCallback((): void => {
        queryClient.clear();
    }, [queryClient]);
};
