import { apiClient } from '@/shared/api/client';

import type {
    ChangePasswordRequest,
    SecurityCategory,
    SecurityLog,
    UpdateOwnNameRequest,
    UserSessions,
} from '../types';

export const SESSIONS_PAGE_SIZE = 5;
export const SECURITY_LOG_PAGE_SIZE = 10;

const BASE = '/api/v1/auth';

export const accountApi = {
    /** Admins and owners only (the server refuses everyone else). */
    updateName: async (request: UpdateOwnNameRequest): Promise<void> => {
        await apiClient.put(`${BASE}/profile`, request);
    },
    /** Every session ends; this browser gets a new one (new cookies in the answer). */
    changePassword: async (request: ChangePasswordRequest): Promise<void> => {
        await apiClient.put(`${BASE}/password`, request);
    },
    sessions: async (page: number): Promise<UserSessions> =>
        (
            await apiClient.get<UserSessions>(`${BASE}/sessions`, {
                params: { page, size: SESSIONS_PAGE_SIZE },
            })
        ).data,
    securityLog: async (category: SecurityCategory | undefined, after: string | undefined): Promise<SecurityLog> =>
        (
            await apiClient.get<SecurityLog>(`${BASE}/security-log`, {
                params: { category, after, size: SECURITY_LOG_PAGE_SIZE },
            })
        ).data,
    endSession: async (sessionId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/sessions/${encodeURIComponent(sessionId)}`);
    },
    endOtherSessions: async (): Promise<void> => {
        await apiClient.delete(`${BASE}/sessions`);
    },
};
