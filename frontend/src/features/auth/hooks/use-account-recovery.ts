import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/shared/api/api-error';

import { authApi } from '../api/auth-api';
import type {
    CurrentUser,
    EmailVerification,
    PasswordResetRequestRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
} from '../types';
import { authKeys } from './query-keys';

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
