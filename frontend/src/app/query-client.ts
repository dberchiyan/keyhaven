import { QueryClient } from '@tanstack/react-query';

import { ApiContractError, isApiError } from '@/shared/api/api-error';
import { MS_PER_SECOND } from '@/shared/lib/units';

const MAX_RETRIES = 2;
const STALE_SECONDS = 30;

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: STALE_SECONDS * MS_PER_SECOND,
            retry: (failureCount, error) =>
                !(isApiError(error) && error.isClientError) &&
                !(error instanceof ApiContractError) &&
                failureCount < MAX_RETRIES,
        },
        mutations: { retry: false },
    },
});
