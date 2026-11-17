import type { Decimal, Money } from '@/common/persistence/money';

import type { InsightPeriod } from './insight-period';
import type { ListingKind } from './listing-kind';
import type { ListingStatus } from './listing-status';
import type { PhotoContentType, PhotoStatus } from './photo-status';
import type { PropertyType } from './property-type';

export interface ListingCity {
    id: string;
    name: string;
    state: string;
    slug: string;
    timeZone: string;
}

export interface ListingCard {
    isSaved: boolean;
    id: string;
    title: string;
    propertyType: PropertyType;
    kind: ListingKind;
    price: Money;
    bedrooms: number;
    bathrooms: string;
    sizeSqft: number;
    city: ListingCity;
    neighborhood: string | null;
    availableAt: Date | null;
    publishedAt: Date | null;
    coverPhotoUrl: string | null;
    viewCount: number;
}

export interface ManagedListingCard extends ListingCard {
    status: ListingStatus;
    isDemo: boolean;
    saveCount: number;
}

export type ListedBy =
    | { kind: 'LANDLORD'; name: string; phone: string | null; email: string }
    | { kind: 'AGENCY'; name: string; phone: string; email: string; website: string | null };

export interface ListingAddress {
    line1: string;
    line2: string | null;
}

export interface PriceContext {
    scope: 'NEIGHBORHOOD' | 'CITY';
    median: Money;
    sample: number;
    differencePercent: number;
}

export interface ListingDetail extends ListingCard {
    isDemo: boolean;
    priceContext: PriceContext | null;
    description: string;
    isFurnished: boolean;
    isPetFriendly: boolean;
    hasParking: boolean;
    zip: string;
    photos: { id: string; url: string }[];
    listedBy: ListedBy;
    address: ListingAddress | null;
}

export interface ManagedPhoto {
    id: string;
    url: string | null;
    status: PhotoStatus;
    position: number | null;
}

export interface ManagedListing extends ListingDetail {
    status: ListingStatus;
    address: ListingAddress;
    cityId: string;
    saveCount: number;
    managedPhotos: ManagedPhoto[];
    createdAt: Date;
    updatedAt: Date;
    version: number;
}

export interface ListingDraft {
    title: string;
    description: string;
    propertyType: PropertyType;
    kind: ListingKind;
    price: Decimal;
    bedrooms: number;
    bathrooms: Decimal;
    sizeSqft: number;
    addressLine1: string;
    addressLine2: string | null;
    cityId: string;
    neighborhood: string | null;
    zip: string;
    isPetFriendly: boolean;
    isFurnished: boolean;
    hasParking: boolean;
    availableAt: Date | null;
}

export type ListingViewer = { kind: 'USER'; userId: string } | { kind: 'VISITOR'; visitorKey: string };

export interface UpdateListingCommand extends ListingDraft {
    version: number;
}

export interface PhotoUploadIntent {
    photoId: string;
    uploadUrl: string;
    headers: Record<string, string>;
    expiresAt: Date;
}

export interface NewPhotoIntent {
    filename: string;
    contentType: PhotoContentType;
    sizeBytes: number;
}

export type ListingScope =
    { kind: 'LANDLORD'; landlordId: string } | { kind: 'AGENCY'; agencyId: string } | { kind: 'ALL' };

export interface InsightPoint {
    day: string;
    views: number;
    saves: number;
}

export interface InsightTotals {
    views: number;
    saves: number;
}

export interface ListingInsights {
    from: string;
    to: string;
    period: InsightPeriod;
    series: InsightPoint[];
    totals: InsightTotals;
    previous: InsightTotals;
}

export interface InsightTopListing {
    listing: ManagedListingCard;
    views: number;
    saves: number;
}

export interface ManagedInsights extends ListingInsights {
    top: InsightTopListing[];
}

export type InsightTarget = ListingScope | { kind: 'LISTING'; listingId: string };
