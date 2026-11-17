import { apiClient } from '@/shared/api/client';

import type { ListingPage, SavedListing, SavedListParams } from '../types';

const BASE = '/api/v1/saved-listings';

export const savedListingApi = {
    list: async (params: SavedListParams): Promise<ListingPage> =>
        (
            await apiClient.get<ListingPage>(BASE, {
                params: { page: params.page - 1, size: params.size },
            })
        ).data,
    save: async (listingId: string): Promise<SavedListing> =>
        (await apiClient.put<SavedListing>(`${BASE}/${encodeURIComponent(listingId)}`)).data,
    unsave: async (listingId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${encodeURIComponent(listingId)}`);
    },
};
