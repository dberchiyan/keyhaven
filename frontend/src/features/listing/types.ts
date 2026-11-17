import type { BrowseParams } from '@/shared/lib/listing-search';
import type { Schemas } from '@/shared/types';

export type { BrowseParams } from '@/shared/lib/listing-search';

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

const WEEK_PERIOD_DAYS = 7;
const MONTH_PERIOD_DAYS = 30;
const QUARTER_PERIOD_DAYS = 90;

export const INSIGHT_PERIODS = [WEEK_PERIOD_DAYS, MONTH_PERIOD_DAYS, QUARTER_PERIOD_DAYS] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];
export const DEFAULT_INSIGHT_PERIOD: InsightPeriod = MONTH_PERIOD_DAYS;

export interface SavedListParams {
    page: number;
    size: number;
}

export type SearchRequestParams = Omit<BrowseParams, 'page'> & { page: number };

export interface ManagedListParams {
    status: ListingStatus | undefined;
    search: string;
    sort: 'updatedAt,desc' | 'price,desc' | 'price,asc' | 'title,asc';
    page: number;
    size: number;
}

export type ListingTransition = 'publish' | 'unpublish' | 'suspend';

export interface ToggleSavedVariables {
    listingId: string;
    saved: boolean;
}

export interface CreateListingVariables {
    request: CreateListingRequest;
    key: string;
}

export interface PhotoIntentVariables {
    request: PhotoIntentRequest;
    key: string;
}

export type SignedInUser = { id: string } | null | undefined;

export type BrowseFilterChange = Partial<Omit<BrowseParams, 'size' | 'page'>>;
