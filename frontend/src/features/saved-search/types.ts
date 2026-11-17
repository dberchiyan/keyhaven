import type { Schemas } from '@/shared/types';

export type SavedSearch = Schemas['SavedSearch_Output'];
export type SavedSearchCriteria = Schemas['SavedSearchCriteria_Output'];
export type CreateSavedSearchRequest = Schemas['CreateSavedSearchRequest'];
export type UpdateSavedSearchRequest = Schemas['UpdateSavedSearchRequest'];

export interface CreateSavedSearchVariables {
    request: CreateSavedSearchRequest;
    key: string;
}

export interface UpdateSavedSearchVariables {
    id: string;
    request: UpdateSavedSearchRequest;
}
