import { apiClient } from '@/shared/api/client';
import { toApiKind } from '@/shared/lib/listing-search';

import type { BrowseParams, City, ListingCard, ListingDetail, ListingPage } from '../types';

const BASE = '/api/v1';

export const listingApi = {
    cities: async (): Promise<City[]> => (await apiClient.get<{ content: City[] }>(`${BASE}/cities`)).data.content,
    search: async (params: BrowseParams): Promise<ListingPage> =>
        (
            await apiClient.get<ListingPage>(`${BASE}/listings`, {
                params: {
                    kind: toApiKind(params.kind),
                    type: params.type,
                    city: params.city,
                    priceMin: params.priceMin,
                    priceMax: params.priceMax,
                    beds: params.beds,
                    baths: params.baths,
                    isPetFriendly: params.isPetFriendly,
                    isFurnished: params.isFurnished,
                    hasParking: params.hasParking,
                    moveInOn: params.moveInOn,
                    q: params.q,
                    sort: params.sort,
                    page: params.page - 1,
                    size: params.size,
                },
            })
        ).data,
    find: async (listingId: string): Promise<ListingDetail> =>
        (await apiClient.get<ListingDetail>(`${BASE}/listings/${encodeURIComponent(listingId)}`)).data,
    similar: async (listingId: string): Promise<ListingCard[]> =>
        (await apiClient.get<{ content: ListingCard[] }>(`${BASE}/listings/${encodeURIComponent(listingId)}/similar`))
            .data.content,
    /** A visitor's recently viewed ids live in their browser only (FSEC-4); the server answers in the given order. */
    cards: async (ids: readonly string[]): Promise<ListingCard[]> =>
        (
            await apiClient.get<{ content: ListingCard[] }>(`${BASE}/listing-cards`, {
                params: { ids: ids.join(',') },
            })
        ).data.content,
    /** A signed-in person's recently viewed homes come from their views on the server, not the browser. */
    recent: async (): Promise<ListingCard[]> =>
        (await apiClient.get<{ content: ListingCard[] }>(`${BASE}/recent-listings`)).data.content,
};
