import type { BrowseParams } from '@/shared/lib/listingSearch';
import type { Schemas } from '@/shared/types';

export type { BrowseParams } from '@/shared/lib/listingSearch';

export type City = Schemas['City_Output'];
export type ListingCard = Schemas['ListingCard_Output'];
export type ListingPage = Schemas['ListingPageResponse_Output'];
export type ManagedListingCard = Schemas['ManagedListingCard_Output'];
export type ManagedListingPage = Schemas['ManagedListingPageResponse_Output'];
export type ListingDetail = Schemas['ListingDetailResponse_Output'];
export type ManagedListing = Schemas['ManagedListingResponse_Output'];
export type ListingStatusCounts = Schemas['ListingStatusCountsResponse_Output'];
export type ListingStatus = Schemas['ListingStatus_Output'];
export type ListingKind = Schemas['ListingKind_Output'];
export type PropertyType = Schemas['PropertyType_Output'];
export type ListedBy = Schemas['ListedBy_Output'];
export type ManagedPhoto = Schemas['ManagedPhoto_Output'];
export type PhotoStatus = Schemas['PhotoStatus_Output'];
export type CreateListingRequest = Schemas['CreateListingRequest'];
export type UpdateListingRequest = Schemas['UpdateListingRequest'];
export type PhotoIntentRequest = Schemas['PhotoIntentRequest'];
export type PhotoIntent = Schemas['PhotoIntentResponse_Output'];
export type SavedListing = Schemas['SavedListingResponse_Output'];
export type ListingInsights = Schemas['ListingInsightsResponse_Output'];
export type ManagedInsights = Schemas['ManagedInsightsResponse_Output'];
export type InsightPoint = Schemas['InsightPoint_Output'];
export type InsightTotals = Schemas['InsightTotals_Output'];

/** The insights' window in days, today included (backend: service/insight-period.ts). */
export const INSIGHT_PERIODS = [7, 30, 90] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];
export const DEFAULT_INSIGHT_PERIOD: InsightPeriod = 30;

/** A tenant's saved homes: newest save first; page and size only. */
export interface SavedListParams {
    page: number;
    size: number;
}

/** The search request as the API takes it (zero-based page). */
export type SearchRequestParams = Omit<BrowseParams, 'page'> & { page: number };

/** The owner's dashboard: status, search, order, page and size. */
export interface ManagedListParams {
    status: ListingStatus | undefined;
    search: string;
    sort: 'updatedAt,desc' | 'price,desc' | 'price,asc' | 'title,asc';
    page: number;
    size: number;
}

/** A status change the owner (publish, unpublish) or an admin (suspend) makes. */
export type ListingTransition = 'publish' | 'unpublish' | 'suspend';
