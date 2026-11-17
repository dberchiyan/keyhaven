import type { ManagedViewingsParams } from '../types';

/** The caller comes from the session; the cache is cleared on sign-out. */
export const viewingKeys = {
    all: ['viewings'] as const,
    slots: (listingId: string, from: string | undefined) =>
        [...viewingKeys.all, 'slots', listingId, from ?? ''] as const,
    own: () => [...viewingKeys.all, 'own'] as const,
    detail: (id: string) => [...viewingKeys.all, 'detail', id] as const,
    managed: () => [...viewingKeys.all, 'managed'] as const,
    managedList: (params: ManagedViewingsParams) => [...viewingKeys.managed(), 'list', params] as const,
    summary: () => [...viewingKeys.managed(), 'summary'] as const,
    listing: (listingId: string) => [...viewingKeys.managed(), 'listing', listingId] as const,
    schedule: (listingId: string) => [...viewingKeys.all, 'schedule', listingId] as const,
};
