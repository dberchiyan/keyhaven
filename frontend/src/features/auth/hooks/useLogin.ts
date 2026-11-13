import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api/apiError';
import { authApi } from '../api/authApi';
import type { CurrentUser, LoginRequest } from '../types';
import { authKeys } from './queryKeys';

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation<CurrentUser, ApiError, LoginRequest>({
    mutationFn: authApi.login,
    onSuccess: async (user) => {
      // What the visitor browsed signed out is read again as this person (their saved homes).
      queryClient.setQueryData(authKeys.me(), user);
      await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
    },
  });
};
