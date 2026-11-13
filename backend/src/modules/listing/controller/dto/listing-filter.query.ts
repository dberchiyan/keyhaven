import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { LISTING_KINDS } from '../../service/listing-kind';
import { LISTING_STATUSES } from '../../service/listing-status';
import { PROPERTY_TYPES } from '../../service/property-type';

const booleanParam = z
  .enum(['true', 'false'], { error: 'validation.invalid' })
  .transform((value) => value === 'true');

/** A whole-dollar or two-place amount typed into the price filter. */
const amountParam = z
  .string()
  .trim()
  .max(16, 'validation.amount.invalid')
  .regex(/^\d{1,9}(\.\d{1,2})?$/, 'validation.amount.invalid');

export const SEARCH_MAX_LENGTH = 100;

/** The search page's filters, every one optional, all kept in the URL by the client. */
export const ListingFilterQuerySchema = z
  .object({
    /** Homes for rent (default) or for sale. */
    kind: z.enum(LISTING_KINDS, { error: 'validation.invalid' }).default('RENT'),
    /** A city slug from `GET /api/v1/cities`. */
    city: z
      .string()
      .trim()
      .max(100, 'validation.city.invalid')
      .regex(/^[a-z0-9-]+$/, 'validation.city.invalid')
      .optional(),
    type: z.enum(PROPERTY_TYPES, { error: 'validation.invalid' }).optional(),
    /** Monthly rent (RENT) or asking price (SALE). */
    priceMin: amountParam.optional(),
    priceMax: amountParam.optional(),
    /** At least this many bedrooms (0 = studios too). */
    beds: z.coerce.number({ error: 'validation.invalid' }).int().min(0).max(20).optional(),
    /** At least this many bathrooms: 1, 1.5, 2 … */
    baths: z
      .string()
      .regex(/^\d{1,2}(\.5)?$/, 'validation.invalid')
      .optional(),
    pets: booleanParam.optional(),
    furnished: booleanParam.optional(),
    parking: booleanParam.optional(),
    /** Available on or before this day. */
    availableBy: z.iso.date({ error: 'validation.availableBy.invalid' }).optional(),
    /** Free text, typo-tolerant: title, neighborhood, zip or city. */
    q: z.string().trim().max(SEARCH_MAX_LENGTH, 'validation.search.tooLong').optional(),
  })
  .superRefine((query, context) => {
    if (
      query.priceMin !== undefined &&
      query.priceMax !== undefined &&
      Number(query.priceMin) > Number(query.priceMax)
    ) {
      // Compared as numbers only to order the two bounds; the values stay strings.
      context.addIssue({
        code: 'custom',
        path: ['priceMax'],
        message: 'validation.price.maxBelowMin',
      });
    }
  });

export class ListingFilterQuery extends createZodDto(ListingFilterQuerySchema) {}

/** Up to this many cards by id in one call (a visitor's "recently viewed", kept in the browser). */
export const MAX_CARD_IDS = 12;

export const ListingIdsQuerySchema = z.object({
  /** Comma-separated listing ids. */
  ids: z
    .string()
    .trim()
    .max(MAX_CARD_IDS * 37, 'validation.invalid')
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    )
    .pipe(
      z
        .array(z.uuid({ error: 'validation.invalid' }))
        .min(1)
        .max(MAX_CARD_IDS),
    ),
});

export class ListingIdsQuery extends createZodDto(ListingIdsQuerySchema) {}

export const MANAGED_SEARCH_MAX_LENGTH = 100;

/** The dashboard's filters. */
export const ManagedListingFilterQuerySchema = z.object({
  status: z.enum(LISTING_STATUSES, { error: 'validation.invalid' }).optional(),
  search: z.string().trim().max(MANAGED_SEARCH_MAX_LENGTH, 'validation.search.tooLong').optional(),
});

export class ManagedListingFilterQuery extends createZodDto(ManagedListingFilterQuerySchema) {}
