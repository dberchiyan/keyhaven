import { apiClient } from '@/shared/api/client';
import type {
  ManagedListingPage,
  ListingStatusCounts,
  ListingTransition,
  ManagedListing,
  ManagedListParams,
} from '../types';

const BASE = '/api/v1/managed-listings';

/** The sub-resource each transition posts to (api.md → state transitions). */
const TRANSITION_PATH: Record<ListingTransition, string> = {
  publish: 'publication',
  unpublish: 'unpublication',
  suspend: 'suspension',
};

/** The owner's side: a landlord's own listings, an agency's for its agents, all for admins. */
export const managedListingApi = {
  list: async (params: ManagedListParams): Promise<ManagedListingPage> =>
    (
      await apiClient.get<ManagedListingPage>(BASE, {
        params: {
          status: params.status,
          search: params.search || undefined,
          sort: params.sort,
          page: params.page - 1,
          size: params.size,
        },
      })
    ).data,
  statusCounts: async (): Promise<ListingStatusCounts> =>
    (await apiClient.get<ListingStatusCounts>(`${BASE}/status-counts`)).data,
  find: async (listingId: string): Promise<ManagedListing> =>
    (await apiClient.get<ManagedListing>(`${BASE}/${encodeURIComponent(listingId)}`)).data,
  /** No Idempotency-Key: a repeated decision is a no-op on the server. */
  transition: async (listingId: string, transition: ListingTransition): Promise<ManagedListing> =>
    (
      await apiClient.post<ManagedListing>(
        `${BASE}/${encodeURIComponent(listingId)}/${TRANSITION_PATH[transition]}`,
      )
    ).data,
};
