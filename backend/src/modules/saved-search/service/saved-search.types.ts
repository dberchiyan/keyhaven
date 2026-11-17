import type { SavedSearchCriteria } from './saved-search-criteria';

export interface SavedSearch {
    id: string;
    name: string;
    criteria: SavedSearchCriteria;
    emailAlerts: boolean;
    lastNotifiedAt: Date | null;
    createdAt: Date;
    version: number;
}

export interface CreateSavedSearchCommand {
    name: string;
    criteria: SavedSearchCriteria;
    emailAlerts: boolean;
}

export interface UpdateSavedSearchCommand {
    name: string;
    emailAlerts: boolean;
    version: number;
}

/** What one digest run did. */
export interface DigestSummary {
    searches: number;
    emails: number;
}
