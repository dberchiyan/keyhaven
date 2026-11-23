import type { ListingStatus } from './listing-status';

export interface SavedHomeExport {
    listingId: string;
    title: string;
    savedAt: Date;
}

export interface OwnedListingExport {
    id: string;
    title: string;
    status: ListingStatus;
    createdAt: Date;
}

export interface ListingDataExport {
    savedHomes: SavedHomeExport[];
    listings: OwnedListingExport[];
}
