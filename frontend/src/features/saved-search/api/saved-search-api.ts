import { apiClient } from '@/shared/api/client';

import type { CreateSavedSearchRequest, SavedSearch, UpdateSavedSearchRequest } from '../types';

const BASE = '/api/v1/saved-searches';

export const savedSearchApi = {
    list: async (): Promise<SavedSearch[]> => (await apiClient.get<{ content: SavedSearch[] }>(BASE)).data.content,
    /** One Idempotency-Key per dialog opening. */
    create: async (request: CreateSavedSearchRequest, idempotencyKey: string): Promise<SavedSearch> =>
        (
            await apiClient.post<SavedSearch>(BASE, request, {
                headers: { 'Idempotency-Key': idempotencyKey },
            })
        ).data,
    update: async (id: string, request: UpdateSavedSearchRequest): Promise<SavedSearch> =>
        (await apiClient.put<SavedSearch>(`${BASE}/${encodeURIComponent(id)}`, request)).data,
    remove: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${encodeURIComponent(id)}`);
    },
};
