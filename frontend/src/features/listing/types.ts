import type { Schemas } from '@/shared/types';

export type City = Schemas['City_Output'];
export type ListingCard = Schemas['ListingCard_Output'];
export type ListingPage = Schemas['ListingPageResponse_Output'];
export type ManagedListingCard = Schemas['ManagedListingCard_Output'];
export type ManagedListingPage = Schemas['ManagedListingPageResponse_Output'];
export type ListingDetail = Schemas['ListingDetailResponse_Output'];
export type ManagedListing = Schemas['ManagedListingResponse_Output'];
export type ListingStatusCounts = Schemas['ListingStatusCountsResponse_Output'];
export type ListingStatus = Schemas['ListingStatus_Output'];
export type PropertyType = Schemas['PropertyType_Output'];
export type ListedBy = Schemas['ListedBy_Output'];

/** Search (tenant side): the city and the order, page and size. */
export interface BrowseParams {
  city: string | undefined;
  sort: 'publishedAt,desc' | 'rent,asc' | 'rent,desc';
  /** One-based in the URL; the API takes zero-based pages. */
  page: number;
  size: number;
}

/** The owner's dashboard: status, search, order, page and size. */
export interface ManagedListParams {
  status: ListingStatus | undefined;
  search: string;
  sort: 'updatedAt,desc' | 'rent,desc' | 'rent,asc' | 'title,asc';
  page: number;
  size: number;
}

/** A status change the owner (publish, unpublish) or an admin (suspend) makes. */
export type ListingTransition = 'publish' | 'unpublish' | 'suspend';
