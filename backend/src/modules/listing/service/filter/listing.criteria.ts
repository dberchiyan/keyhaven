import type { Decimal } from '@/common/persistence/money';

import type { ListingKind } from '../listing-kind';
import type { ListingStatus } from '../listing-status';
import type { PropertyType } from '../property-type';

export interface ListingCriteria {
    kind: ListingKind;
    citySlug?: string;
    propertyType?: PropertyType;
    priceMin?: Decimal;
    priceMax?: Decimal;
    bedroomsMin?: number;
    bathroomsMin?: Decimal;
    isPetFriendly?: boolean;
    isFurnished?: boolean;
    hasParking?: boolean;
    moveInAt?: Date;
    searchTerms: string[];
    publishedAfter?: Date;
}

export interface ManagedListingCriteria {
    status?: ListingStatus;
    searchTerms: string[];
}
