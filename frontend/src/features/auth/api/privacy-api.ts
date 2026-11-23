import { apiClient } from '@/shared/api/client';

import type { EraseAccountRequest, PersonalDataExport } from '../types';

const BASE = '/api/v1/personal-data';

export const privacyApi = {
    exportData: async (): Promise<PersonalDataExport> => (await apiClient.get<PersonalDataExport>(BASE)).data,
    /** Irreversible: the answer clears the session cookies, so nothing after it is signed in. */
    eraseAccount: async (request: EraseAccountRequest): Promise<void> => {
        await apiClient.post(`${BASE}/erasure`, request);
    },
};
