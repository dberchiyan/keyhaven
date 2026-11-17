import type { SavedSearch } from '../../service/saved-search.types';
import type { SavedSearchResponse } from '../dto/saved-search.response';

export const toSavedSearchResponse = (search: SavedSearch): SavedSearchResponse => ({
    id: search.id,
    name: search.name,
    criteria: search.criteria,
    emailAlerts: search.emailAlerts,
    lastNotifiedAt: search.lastNotifiedAt?.toISOString() ?? null,
    createdAt: search.createdAt.toISOString(),
    version: search.version,
});
