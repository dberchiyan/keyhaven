import { Injectable } from '@nestjs/common';

import { AppConfigService } from '@/common/config/app-config.service';
import { toMoney } from '@/common/persistence/money';
import { ObjectStorage } from '@/modules/storage/service/object-storage';

import type {
    CityRecord,
    ListingCardRecord,
    ListingDetailRecord,
    ManagedListingCardRecord,
    ManagedListingRecord,
    ManagedPhotoRecord,
    ViewerCardRecord,
} from '../repository/record/listing.record';
import type {
    ListedBy,
    ListingAddress,
    ListingCard,
    ListingCity,
    ListingDetail,
    ManagedListing,
    ManagedListingCard,
    ManagedPhoto,
} from './listing.types';
import { isListingKind, type ListingKind } from './listing-kind';
import { isListingStatus, type ListingStatus } from './listing-status';
import { isPhotoStatus } from './photo-status';
import { isPropertyType, type PropertyType } from './property-type';

/** Every value is guarded by a CHECK constraint, so an unknown one is a broken database, not a request error. */
const toKind = (value: string): ListingKind => {
    if (!isListingKind(value)) {
        throw new Error('Unknown listing kind in database');
    }
    return value;
};

/** Guarded by ck_listings_property_type. */
const toPropertyType = (value: string): PropertyType => {
    if (!isPropertyType(value)) {
        throw new Error('Unknown property type in database');
    }
    return value;
};

/** Guarded by ck_listings_status. */
export const toStatus = (value: string): ListingStatus => {
    if (!isListingStatus(value)) {
        throw new Error('Unknown listing status in database');
    }
    return value;
};

export const toCity = (city: CityRecord): ListingCity => ({
    id: city.id,
    name: city.name,
    state: city.state,
    slug: city.slug,
    timeZone: city.timeZone,
});

/** ck_listings_owner guarantees exactly one owner: the agency's contact wins, else the landlord's. */
const toListedBy = (listing: ListingDetailRecord): ListedBy => {
    if (listing.agency) {
        return {
            kind: 'AGENCY',
            name: listing.agency.name,
            phone: listing.agency.phone,
            email: listing.agency.email,
            website: listing.agency.website,
        };
    }
    if (listing.landlord) {
        return {
            kind: 'LANDLORD',
            name: `${listing.landlord.firstName} ${listing.landlord.lastName}`,
            phone: listing.landlord.phone,
            email: listing.landlord.email,
        };
    }
    throw new Error('Listing without an owner in database');
};

/**
 * Turns listing records into the service's views. Injectable because a photo's URL needs the storage port and the
 * showcase flag needs the configuration (showcase rows are read-only in the demo only; locally the seed is editable).
 */
@Injectable()
export class ListingCardService {
    constructor(
        private readonly storage: ObjectStorage,
        private readonly config: AppConfigService,
    ) {}

    toViewerCard(listing: ViewerCardRecord): ListingCard {
        return this.toCard(listing, listing.savedBy.length > 0);
    }

    toManagedCard(listing: ManagedListingCardRecord): ManagedListingCard {
        return {
            ...this.toCard(listing, false),
            status: toStatus(listing.status),
            isDemo: this.isShowcase(listing),
            saveCount: listing._count.savedBy,
        };
    }

    /** The price context is left empty: only the pages that show a price against the market fill it. */
    toDetail(listing: ListingDetailRecord, address: ListingAddress | null, isSaved = false): ListingDetail {
        return {
            ...this.toCard(listing, isSaved),
            isDemo: this.isShowcase(listing),
            description: listing.description,
            isFurnished: listing.isFurnished,
            isPetFriendly: listing.isPetFriendly,
            hasParking: listing.hasParking,
            zip: listing.zip,
            photos: listing.photos.flatMap((photo) => {
                const url = this.photoUrl(photo);
                return url ? [{ id: photo.id, url }] : [];
            }),
            listedBy: toListedBy(listing),
            address,
            priceContext: null,
        };
    }

    toManaged(listing: ManagedListingRecord, photos: ManagedPhotoRecord[]): ManagedListing {
        const address = { line1: listing.addressLine1, line2: listing.addressLine2 };
        return {
            ...this.toDetail(listing, address),
            status: toStatus(listing.status),
            address,
            cityId: listing.cityId,
            saveCount: listing._count.savedBy,
            managedPhotos: photos.map((photo) => this.toManagedPhoto(photo)),
            createdAt: listing.createdAt,
            updatedAt: listing.updatedAt,
            version: listing.version,
        };
    }

    private toCard(listing: ListingCardRecord, isSaved: boolean): ListingCard {
        const cover = listing.photos[0];
        return {
            id: listing.id,
            title: listing.title,
            propertyType: toPropertyType(listing.propertyType),
            kind: toKind(listing.kind),
            price: toMoney(listing.price, listing.currency),
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms.toFixed(1),
            sizeSqft: listing.sizeSqft,
            city: toCity(listing.city),
            neighborhood: listing.neighborhood,
            availableAt: listing.availableAt,
            publishedAt: listing.publishedAt,
            coverPhotoUrl: cover ? this.photoUrl(cover) : null,
            viewCount: listing._count.views,
            isSaved,
        };
    }

    /** Guarded by ck_listing_photos_status. */
    private toManagedPhoto(photo: ManagedPhotoRecord): ManagedPhoto {
        if (!isPhotoStatus(photo.status)) {
            throw new Error('Unknown photo status in database');
        }
        return { id: photo.id, url: this.photoUrl(photo), status: photo.status, position: photo.position };
    }

    /** Seeded rows carry an external URL; uploaded ones are served from the stored object. */
    private photoUrl(photo: { url: string | null; storageKey: string | null }): string | null {
        return photo.url ?? (photo.storageKey ? this.storage.publicUrl(photo.storageKey) : null);
    }

    private isShowcase(listing: { isDemo: boolean }): boolean {
        return this.config.isDemo && listing.isDemo;
    }
}
