import type { SavedSearch } from '@/modules/saved-search/service/saved-search.types';

import type { SavedSearchResponse } from '../dto/saved-search.response';

export const toSavedSearchResponse = (search: SavedSearch): SavedSearchResponse => ({
    id: search.id,
    name: search.name,
    criteria: search.criteria,
    hasEmailAlerts: search.hasEmailAlerts,
    lastNotifiedAt: search.lastNotifiedAt?.toISOString() ?? null,
    createdAt: search.createdAt.toISOString(),
    version: search.version,
});
