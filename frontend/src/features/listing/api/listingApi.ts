import { apiClient } from '@/shared/api/client';
import { toApiKind } from '@/shared/lib/listingSearch';
import type { BrowseParams, City, ListingCard, ListingDetail, ListingPage } from '../types';

const BASE = '/api/v1';

/** The public catalogue: the cities and the published homes (a session only adds "saved"). */
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
                    pets: params.pets,
                    furnished: params.furnished,
                    parking: params.parking,
                    availableBy: params.availableBy,
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
    /** Cards for a visitor's own list of ids, in that order. */
    cards: async (ids: readonly string[]): Promise<ListingCard[]> =>
        (
            await apiClient.get<{ content: ListingCard[] }>(`${BASE}/listing-cards`, {
                params: { ids: ids.join(',') },
            })
        ).data.content,
    /** A signed-in person's recently opened homes (from their views on the server). */
    recent: async (): Promise<ListingCard[]> =>
        (await apiClient.get<{ content: ListingCard[] }>(`${BASE}/recent-listings`)).data.content,
};
