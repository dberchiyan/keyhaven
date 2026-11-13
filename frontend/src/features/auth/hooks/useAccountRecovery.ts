import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api/apiError';
import { authApi } from '../api/authApi';
import type {
  CurrentUser,
  EmailVerification,
  PasswordResetRequestRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '../types';
import { authKeys } from './queryKeys';

/**
 * Creates an account. The answer signs the person in, so everything cached for the visitor
 * ("not signed in") is dropped and the app loads afresh as them.
 */
export const useRegister = () => {
  const queryClient = useQueryClient();
  return useMutation<CurrentUser, ApiError, RegisterRequest>({
    mutationFn: authApi.register,
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

/** The link from the verification email; the signed-in user (if any) is re-read afterwards. */
export const useVerifyEmail = () => {
  const queryClient = useQueryClient();
  return useMutation<EmailVerification, ApiError, VerifyEmailRequest>({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
};

export const useResendVerification = () =>
  useMutation<unknown, ApiError>({ mutationFn: authApi.resendVerification });

export const useRequestPasswordReset = () =>
  useMutation<unknown, ApiError, PasswordResetRequestRequest>({
    mutationFn: authApi.requestPasswordReset,
  });

/** A new password through the emailed link; the answer signs this browser in (cache dropped). */
export const useResetPassword = () => {
  const queryClient = useQueryClient();
  return useMutation<CurrentUser, ApiError, ResetPasswordRequest>({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      queryClient.clear();
    },
  });
};
