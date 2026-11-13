import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MoneySchema } from '../../../../common/dto/money';
import { pageResponseSchema } from '../../../../common/dto/page.response';
import { LISTING_STATUSES } from '../../service/listing-status';
import { PHOTO_STATUSES } from '../../service/photo-status';
import { PROPERTY_TYPES } from '../../service/property-type';

export const PropertyTypeSchema = z.enum(PROPERTY_TYPES).meta({ id: 'PropertyType' });
export const ListingStatusSchema = z.enum(LISTING_STATUSES).meta({ id: 'ListingStatus' });

export const CitySchema = z
  .object({
    id: z.uuid(),
    name: z.string().max(100),
    /** USPS state code. */
    state: z.string().length(2),
    /** For `?city=` in search. */
    slug: z.string().max(100),
    /** IANA time zone (viewing times are shown in it). */
    timeZone: z.string().max(64),
  })
  .meta({ id: 'City' });

/** A search result card. */
export const ListingCardSchema = z
  .object({
    id: z.uuid(),
    title: z.string().max(120),
    propertyType: PropertyTypeSchema,
    /** Monthly rent. */
    rent: MoneySchema,
    bedrooms: z.number().int().min(0),
    /** "1.5" — a decimal string with one place. */
    bathrooms: z.string().regex(/^\d{1,2}\.\d$/),
    sizeSqft: z.number().int().min(1),
    city: CitySchema,
    neighborhood: z.string().max(100).nullable(),
    availableFrom: z.iso.date(),
    publishedAt: z.iso.datetime().nullable(),
    coverPhotoUrl: z.string().max(500).nullable(),
    /** The viewer saved it (tenants); false for everyone else. */
    saved: z.boolean(),
  })
  .meta({ id: 'ListingCard' });

/** A row of the owner's dashboard: the card plus its status, views and saves. */
export const ManagedListingCardSchema = z
  .object({
    ...ListingCardSchema.shape,
    status: ListingStatusSchema,
    viewCount: z.number().int().min(0),
    saveCount: z.number().int().min(0),
  })
  .meta({ id: 'ManagedListingCard' });

/** A photo as its owner manages it: pending uploads included. */
export const ManagedPhotoSchema = z
  .object({
    id: z.uuid(),
    url: z.string().max(500).nullable(),
    status: z.enum(PHOTO_STATUSES).meta({ id: 'PhotoStatus' }),
    position: z.number().int().min(0).nullable(),
  })
  .meta({ id: 'ManagedPhoto' });

const ListedBySchema = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('LANDLORD'),
      name: z.string().max(201),
      phone: z.string().max(32).nullable(),
      email: z.string().max(254),
    }),
    z.object({
      kind: z.literal('AGENCY'),
      name: z.string().max(120),
      phone: z.string().max(32),
      email: z.string().max(254),
      website: z.string().max(255).nullable(),
    }),
  ])
  .meta({ id: 'ListedBy' });

/** The private part of the address; null when the caller may not see it. */
const ListingAddressSchema = z
  .object({ line1: z.string().max(255), line2: z.string().max(255).nullable() })
  .meta({ id: 'ListingAddress' });

export const ListingDetailSchema = z
  .object({
    ...ListingCardSchema.shape,
    description: z.string().max(4000),
    furnished: z.boolean(),
    petsAllowed: z.boolean(),
    parking: z.boolean(),
    zip: z.string().max(10),
    photos: z.array(z.object({ id: z.uuid(), url: z.string().max(500) })).max(20),
    listedBy: ListedBySchema,
    /** Shown to the owner, the agency's agents and admins; null for everyone else (M2: confirmed viewings). */
    address: ListingAddressSchema.nullable(),
  })
  .meta({ id: 'ListingDetail' });

/** A listing as its owner (or an admin) manages it. */
export const ManagedListingSchema = z
  .object({
    ...ListingDetailSchema.shape,
    status: ListingStatusSchema,
    address: ListingAddressSchema,
    cityId: z.uuid(),
    viewCount: z.number().int().min(0),
    saveCount: z.number().int().min(0),
    managedPhotos: z.array(ManagedPhotoSchema).max(40),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    version: z.number().int().min(0),
  })
  .meta({ id: 'ManagedListing' });

/** Plain body types for the mappers (a DTO class instance must not be spread). */
export type ListingDetailBody = z.infer<typeof ListingDetailSchema>;
export type ManagedListingBody = z.infer<typeof ManagedListingSchema>;

export class CitiesResponse extends createZodDto(
  z.object({ content: z.array(CitySchema).max(100) }),
) {}
export class ListingPageResponse extends createZodDto(pageResponseSchema(ListingCardSchema)) {}
export class ManagedListingPageResponse extends createZodDto(
  pageResponseSchema(ManagedListingCardSchema),
) {}
export class ListingDetailResponse extends createZodDto(z.object(ListingDetailSchema.shape)) {}
export class ManagedListingResponse extends createZodDto(z.object(ManagedListingSchema.shape)) {}

/** A tenant's saved home. */
export class SavedListingResponse extends createZodDto(
  z.object({ listingId: z.uuid(), saved: z.boolean() }),
) {}

/** How many listings the caller manages in each status. */
export class ListingStatusCountsResponse extends createZodDto(
  z.object({
    DRAFT: z.number().int().min(0),
    PUBLISHED: z.number().int().min(0),
    UNPUBLISHED: z.number().int().min(0),
    SUSPENDED: z.number().int().min(0),
  }),
) {}
