import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AmountInputSchema } from '../../../../common/dto/money';
import { PROPERTY_TYPES } from '../../service/property-type';

/** Mirrors the columns of `listings` (data.md); the frontend mirrors this schema. */
export const LISTING_LIMITS = {
  title: 120,
  description: 4000,
  addressLine: 255,
  neighborhood: 100,
  zip: 10,
  bedrooms: 20,
  sizeSqft: 100_000,
} as const;

const optionalText = (max: number, key: string) =>
  z
    .string()
    .trim()
    .max(max, key)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .optional();

export const ListingDraftSchema = z.object({
  title: z
    .string({ error: 'validation.title.required' })
    .trim()
    .min(1, 'validation.title.required')
    .max(LISTING_LIMITS.title, 'validation.title.tooLong'),
  description: z
    .string({ error: 'validation.description.required' })
    .trim()
    .min(1, 'validation.description.required')
    .max(LISTING_LIMITS.description, 'validation.description.tooLong'),
  propertyType: z.enum(PROPERTY_TYPES, { error: 'validation.propertyType.required' }),
  /** Monthly rent in USD, typed as "1850" or "1850.50". */
  rent: AmountInputSchema,
  bedrooms: z
    .number({ error: 'validation.bedrooms.invalid' })
    .int('validation.bedrooms.invalid')
    .min(0, 'validation.bedrooms.invalid')
    .max(LISTING_LIMITS.bedrooms, 'validation.bedrooms.invalid'),
  /** "1", "1.5", "2" … */
  bathrooms: z
    .string({ error: 'validation.bathrooms.invalid' })
    .regex(/^(?:[1-9]|1\d)(?:\.5)?$|^20$/, 'validation.bathrooms.invalid'),
  sizeSqft: z
    .number({ error: 'validation.sizeSqft.invalid' })
    .int('validation.sizeSqft.invalid')
    .min(1, 'validation.sizeSqft.invalid')
    .max(LISTING_LIMITS.sizeSqft, 'validation.sizeSqft.invalid'),
  addressLine1: z
    .string({ error: 'validation.addressLine1.required' })
    .trim()
    .min(1, 'validation.addressLine1.required')
    .max(LISTING_LIMITS.addressLine, 'validation.addressLine1.tooLong'),
  addressLine2: optionalText(LISTING_LIMITS.addressLine, 'validation.addressLine2.tooLong'),
  cityId: z.uuid({ error: 'validation.city.required' }),
  neighborhood: optionalText(LISTING_LIMITS.neighborhood, 'validation.neighborhood.tooLong'),
  zip: z
    .string({ error: 'validation.zip.required' })
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, 'validation.zip.invalid'),
  petsAllowed: z.boolean({ error: 'validation.invalid' }),
  furnished: z.boolean({ error: 'validation.invalid' }),
  parking: z.boolean({ error: 'validation.invalid' }),
  availableFrom: z.iso.date({ error: 'validation.availableFrom.invalid' }),
});

export class CreateListingRequest extends createZodDto(ListingDraftSchema) {}

export const UpdateListingRequestSchema = ListingDraftSchema.extend({
  version: z.number({ error: 'validation.invalid' }).int().min(0),
});

export class UpdateListingRequest extends createZodDto(UpdateListingRequestSchema) {}
