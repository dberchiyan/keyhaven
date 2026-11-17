import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/shared/api/api-error';
import { PATHS } from '@/shared/lib/paths';
import { todayUtcIso } from '@/shared/lib/utc-day';

import { privacyApi } from '../api/privacy-api';
import type { EraseAccountRequest, PersonalDataExport } from '../types';

const JSON_INDENT = 2;

/** Hands the copy to the browser as a file; the object URL is released once the click started the download. */
const saveAsFile = (data: PersonalDataExport): void => {
    const blob = new Blob([JSON.stringify(data, null, JSON_INDENT)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyhaven-data-${todayUtcIso()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

/**
 * DATA-23: a copy of one's data, saved as a file. A mutation, not a query: the person asks for it
 * once, nothing on screen shows it, and personal data should not linger in the query cache.
 */
export const useDownloadPersonalData = (): UseMutationResult<unknown, ApiError, void> =>
    useMutation<unknown, ApiError>({
        mutationFn: async () => {
            saveAsFile(await privacyApi.exportData());
        },
        gcTime: 0,
    });

/**
 * DATA-23: erasing one's account — never optimistic (QRY-4). On success every cached answer goes
 * (NAV-3) and `/` loads in full: without a session nginx serves the landing there.
 */
export const useEraseAccount = (): UseMutationResult<unknown, ApiError, EraseAccountRequest> => {
    const queryClient = useQueryClient();
    return useMutation<unknown, ApiError, EraseAccountRequest>({
        mutationFn: privacyApi.eraseAccount,
        onSuccess: () => {
            queryClient.clear();
            window.location.replace(PATHS.home);
        },
    });
};
