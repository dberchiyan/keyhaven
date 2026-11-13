import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { LISTING_STATUSES } from '../../service/listing-status';

/** Search filters (M0: the city; M1 adds rent, beds, baths, amenities, dates and text). */
export const ListingFilterQuerySchema = z.object({
  /** A city slug from `GET /api/v1/cities`. */
  city: z
    .string()
    .trim()
    .max(100, 'validation.city.invalid')
    .regex(/^[a-z0-9-]+$/, 'validation.city.invalid')
    .optional(),
});

export class ListingFilterQuery extends createZodDto(ListingFilterQuerySchema) {}

export const MANAGED_SEARCH_MAX_LENGTH = 100;

/** The dashboard's filters. */
export const ManagedListingFilterQuerySchema = z.object({
  status: z.enum(LISTING_STATUSES, { error: 'validation.invalid' }).optional(),
  search: z.string().trim().max(MANAGED_SEARCH_MAX_LENGTH, 'validation.search.tooLong').optional(),
});

export class ManagedListingFilterQuery extends createZodDto(ManagedListingFilterQuerySchema) {}
