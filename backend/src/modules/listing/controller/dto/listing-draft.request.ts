import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import {
    ADDRESS_LINE_MAX_LENGTH,
    LISTING_DESCRIPTION_MAX_LENGTH,
    LISTING_TITLE_MAX_LENGTH,
    MAX_BEDROOMS,
    NEIGHBORHOOD_MAX_LENGTH,
    ZIP_MAX_LENGTH,
} from '@/common/dto/limits';
import { AmountInputSchema } from '@/common/dto/money';
import { LISTING_KINDS } from '@/modules/listing/service/listing-kind';
import { PROPERTY_TYPES } from '@/modules/listing/service/property-type';

const MAX_SIZE_SQFT = 100_000;

export const LISTING_LIMITS = {
    title: LISTING_TITLE_MAX_LENGTH,
    description: LISTING_DESCRIPTION_MAX_LENGTH,
    addressLine: ADDRESS_LINE_MAX_LENGTH,
    neighborhood: NEIGHBORHOOD_MAX_LENGTH,
    zip: ZIP_MAX_LENGTH,
    bedrooms: MAX_BEDROOMS,
    sizeSqft: MAX_SIZE_SQFT,
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
    kind: z.enum(LISTING_KINDS, { error: 'validation.kind.required' }),
    price: AmountInputSchema,
    bedrooms: z
        .number({ error: 'validation.bedrooms.invalid' })
        .int('validation.bedrooms.invalid')
        .min(0, 'validation.bedrooms.invalid')
        .max(LISTING_LIMITS.bedrooms, 'validation.bedrooms.invalid'),
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
    isPetFriendly: z.boolean({ error: 'validation.invalid' }),
    isFurnished: z.boolean({ error: 'validation.invalid' }),
    hasParking: z.boolean({ error: 'validation.invalid' }),
    availableOn: z.iso.date({ error: 'validation.availableOn.invalid' }).nullable().optional(),
});

/** A home for rent needs its move-in day; checked here so the field itself gets the message. */
const moveInDayRequired = (draft: { kind: string; availableOn?: string | null }, context: z.RefinementCtx): void => {
    if (draft.kind === 'RENT' && !draft.availableOn) {
        context.addIssue({
            code: 'custom',
            path: ['availableOn'],
            message: 'validation.availableOn.invalid',
        });
    }
};

export class CreateListingRequest extends createZodDto(ListingDraftSchema.superRefine(moveInDayRequired)) {}

export const UpdateListingRequestSchema = ListingDraftSchema.extend({
    version: z.number({ error: 'validation.invalid' }).int().min(0),
});

export class UpdateListingRequest extends createZodDto(UpdateListingRequestSchema.superRefine(moveInDayRequired)) {}
