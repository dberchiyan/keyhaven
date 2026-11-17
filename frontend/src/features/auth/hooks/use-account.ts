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

import type { ApiError } from '@/shared/api/api-error';

import { accountApi } from '../api/account-api';
import type {
    ChangePasswordRequest,
    SecurityCategory,
    SecurityLog,
    UpdateOwnNameRequest,
    UserSessions,
} from '../types';
import { authKeys } from './query-keys';

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
