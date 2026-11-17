import type { SavedSearchCriteria } from './saved-search-criteria';

export interface SavedSearch {
    id: string;
    name: string;
    criteria: SavedSearchCriteria;
    hasEmailAlerts: boolean;
    lastNotifiedAt: Date | null;
    createdAt: Date;
    version: number;
}

export interface CreateSavedSearchCommand {
    name: string;
    criteria: SavedSearchCriteria;
    hasEmailAlerts: boolean;
}

export interface UpdateSavedSearchCommand {
    name: string;
    hasEmailAlerts: boolean;
    version: number;
}

export interface DigestSummary {
    searches: number;
    emails: number;
}
