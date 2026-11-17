import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import {
    ADDRESS_LINE_MAX_LENGTH,
    AGENCY_NAME_MAX_LENGTH,
    CITY_NAME_MAX_LENGTH,
    CITY_SLUG_MAX_LENGTH,
    EMAIL_MAX_LENGTH,
    LISTING_DESCRIPTION_MAX_LENGTH,
    LISTING_TITLE_MAX_LENGTH,
    NEIGHBORHOOD_MAX_LENGTH,
    PERSON_FULL_NAME_MAX_LENGTH,
    PHONE_MAX_LENGTH,
    PHOTO_URL_MAX_LENGTH,
    TIME_ZONE_MAX_LENGTH,
    WEBSITE_MAX_LENGTH,
    ZIP_MAX_LENGTH,
} from '@/common/dto/limits';
import { MoneySchema } from '@/common/dto/money';
import { pageResponseSchema } from '@/common/dto/page.response';
import { LISTING_KINDS } from '@/modules/listing/service/listing-kind';
import { MAX_CITIES, MAX_STRIP_CARDS } from '@/modules/listing/service/listing-limits';
import { LISTING_STATUSES } from '@/modules/listing/service/listing-status';
import { MAX_PENDING_PHOTOS, MAX_PHOTOS, PHOTO_STATUSES } from '@/modules/listing/service/photo-status';
import { PROPERTY_TYPES } from '@/modules/listing/service/property-type';

const MIN_DIFFERENCE_PERCENT = -1000;
const MAX_DIFFERENCE_PERCENT = 100_000;

export const PropertyTypeSchema = z.enum(PROPERTY_TYPES).meta({ id: 'PropertyType' });
export const ListingStatusSchema = z.enum(LISTING_STATUSES).meta({ id: 'ListingStatus' });
export const ListingKindSchema = z.enum(LISTING_KINDS).meta({ id: 'ListingKind' });

export const CitySchema = z
    .object({
        id: z.uuid(),
        name: z.string().max(CITY_NAME_MAX_LENGTH),
        state: z.string().length(2),
        slug: z.string().max(CITY_SLUG_MAX_LENGTH),
        timeZone: z.string().max(TIME_ZONE_MAX_LENGTH),
    })
    .meta({ id: 'City' });

export const ListingCardSchema = z
    .object({
        id: z.uuid(),
        title: z.string().max(LISTING_TITLE_MAX_LENGTH),
        propertyType: PropertyTypeSchema,
        kind: ListingKindSchema,
        price: MoneySchema,
        bedrooms: z.number().int().min(0),
        bathrooms: z.string().regex(/^\d{1,2}\.\d$/),
        sizeSqft: z.number().int().min(1),
        city: CitySchema,
        neighborhood: z.string().max(NEIGHBORHOOD_MAX_LENGTH).nullable(),
        availableAt: z.iso.date().nullable(),
        publishedAt: z.iso.datetime().nullable(),
        coverPhotoUrl: z.string().max(PHOTO_URL_MAX_LENGTH).nullable(),
        viewCount: z.number().int().min(0),
        isSaved: z.boolean(),
    })
    .meta({ id: 'ListingCard' });

export const ManagedListingCardSchema = z
    .object({
        ...ListingCardSchema.shape,
        status: ListingStatusSchema,
        isDemo: z.boolean(),
        saveCount: z.number().int().min(0),
    })
    .meta({ id: 'ManagedListingCard' });

export const ManagedPhotoSchema = z
    .object({
        id: z.uuid(),
        url: z.string().max(PHOTO_URL_MAX_LENGTH).nullable(),
        status: z.enum(PHOTO_STATUSES).meta({ id: 'PhotoStatus' }),
        position: z.number().int().min(0).nullable(),
    })
    .meta({ id: 'ManagedPhoto' });

const ListedBySchema = z
    .discriminatedUnion('kind', [
        z.object({
            kind: z.literal('LANDLORD'),
            name: z.string().max(PERSON_FULL_NAME_MAX_LENGTH),
            phone: z.string().max(PHONE_MAX_LENGTH).nullable(),
            email: z.string().max(EMAIL_MAX_LENGTH),
        }),
        z.object({
            kind: z.literal('AGENCY'),
            name: z.string().max(AGENCY_NAME_MAX_LENGTH),
            phone: z.string().max(PHONE_MAX_LENGTH),
            email: z.string().max(EMAIL_MAX_LENGTH),
            website: z.string().max(WEBSITE_MAX_LENGTH).nullable(),
        }),
    ])
    .meta({ id: 'ListedBy' });

const PriceContextSchema = z
    .object({
        scope: z.enum(['NEIGHBORHOOD', 'CITY']),
        median: MoneySchema,
        sample: z.number().int().min(1),
        differencePercent: z.number().int().min(MIN_DIFFERENCE_PERCENT).max(MAX_DIFFERENCE_PERCENT),
    })
    .meta({ id: 'PriceContext' });

const ListingAddressSchema = z
    .object({
        line1: z.string().max(ADDRESS_LINE_MAX_LENGTH),
        line2: z.string().max(ADDRESS_LINE_MAX_LENGTH).nullable(),
    })
    .meta({ id: 'ListingAddress' });

export const ListingDetailSchema = z
    .object({
        ...ListingCardSchema.shape,
        isDemo: z.boolean(),
        description: z.string().max(LISTING_DESCRIPTION_MAX_LENGTH),
        isFurnished: z.boolean(),
        isPetFriendly: z.boolean(),
        hasParking: z.boolean(),
        zip: z.string().max(ZIP_MAX_LENGTH),
        photos: z.array(z.object({ id: z.uuid(), url: z.string().max(PHOTO_URL_MAX_LENGTH) })).max(MAX_PHOTOS),
        listedBy: ListedBySchema,
        address: ListingAddressSchema.nullable(),
        priceContext: PriceContextSchema.nullable(),
    })
    .meta({ id: 'ListingDetail' });

export const ManagedListingSchema = z
    .object({
        ...ListingDetailSchema.shape,
        status: ListingStatusSchema,
        address: ListingAddressSchema,
        cityId: z.uuid(),
        saveCount: z.number().int().min(0),
        managedPhotos: z.array(ManagedPhotoSchema).max(MAX_PHOTOS + MAX_PENDING_PHOTOS),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
        version: z.number().int().min(0),
    })
    .meta({ id: 'ManagedListing' });

export type ListingDetailBody = z.infer<typeof ListingDetailSchema>;
export type ManagedListingBody = z.infer<typeof ManagedListingSchema>;

export class CitiesResponse extends createZodDto(z.object({ content: z.array(CitySchema).max(MAX_CITIES) })) {}
export class ListingPageResponse extends createZodDto(pageResponseSchema(ListingCardSchema)) {}
export class ListingCardsResponse extends createZodDto(
    z.object({ content: z.array(ListingCardSchema).max(MAX_STRIP_CARDS) }),
) {}
export class ManagedListingPageResponse extends createZodDto(pageResponseSchema(ManagedListingCardSchema)) {}
export class ListingDetailResponse extends createZodDto(z.object(ListingDetailSchema.shape)) {}
export class ManagedListingResponse extends createZodDto(z.object(ManagedListingSchema.shape)) {}

export class SavedListingResponse extends createZodDto(z.object({ listingId: z.uuid(), isSaved: z.boolean() })) {}

export class ListingStatusCountsResponse extends createZodDto(
    z.object({
        DRAFT: z.number().int().min(0),
        PUBLISHED: z.number().int().min(0),
        UNPUBLISHED: z.number().int().min(0),
        SUSPENDED: z.number().int().min(0),
    }),
) {}
