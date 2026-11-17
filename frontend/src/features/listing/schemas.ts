import { z } from 'zod';

/** Mirrors backend ListingDraftSchema (listing/controller/dto/listing-draft.request.ts). */
export const LISTING_LIMITS = {
    title: 120,
    description: 4000,
    addressLine1: 255,
    addressLine2: 255,
    neighborhood: 100,
    zip: 10,
    bedrooms: 20,
    sizeSqft: 100_000,
} as const;

export const PROPERTY_TYPES = ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'STUDIO'] as const;
export const LISTING_KINDS = ['RENT', 'SALE'] as const;

/** An empty optional field is sent as `null`, the wire's absence. */
const optionalText = (max: number, tooLong: string) =>
    z
        .string()
        .trim()
        .max(max, tooLong)
        .transform((value) => (value.length > 0 ? value : null));

/** Counts arrive as typed text: digits only are checked before they become numbers, so "1e3" never passes. */
const count = (max: number, message: string) =>
    z
        .string()
        .trim()
        .regex(/^\d{1,6}$/, message)
        .transform(Number)
        .pipe(z.number().int().max(max, message));

const listingFormShape = z.object({
    title: z.string().trim().min(1, 'validation:title.required').max(LISTING_LIMITS.title, 'validation:title.tooLong'),
    description: z
        .string()
        .trim()
        .min(1, 'validation:description.required')
        .max(LISTING_LIMITS.description, 'validation:description.tooLong'),
    propertyType: z.enum(PROPERTY_TYPES, { error: 'validation:propertyType.required' }),
    kind: z.enum(LISTING_KINDS, { error: 'validation:kind.required' }),
    price: z
        .string()
        .trim()
        .regex(/^\d{1,13}(\.\d{1,2})?$/, 'validation:amount.invalid')
        .refine((value) => /[1-9]/.test(value), 'validation:amount.invalid'),
    bedrooms: count(LISTING_LIMITS.bedrooms, 'validation:bedrooms.invalid'),
    bathrooms: z
        .string()
        .trim()
        .regex(/^(?:[1-9]|1\d)(?:\.5)?$|^20$/, 'validation:bathrooms.invalid'),
    sizeSqft: count(LISTING_LIMITS.sizeSqft, 'validation:sizeSqft.invalid').pipe(
        z.number().min(1, 'validation:sizeSqft.invalid'),
    ),
    addressLine1: z
        .string()
        .trim()
        .min(1, 'validation:addressLine1.required')
        .max(LISTING_LIMITS.addressLine1, 'validation:addressLine1.tooLong'),
    addressLine2: optionalText(LISTING_LIMITS.addressLine2, 'validation:addressLine2.tooLong'),
    cityId: z.string().min(1, 'validation:city.required'),
    neighborhood: optionalText(LISTING_LIMITS.neighborhood, 'validation:neighborhood.tooLong'),
    zip: z
        .string()
        .trim()
        .regex(/^\d{5}(-\d{4})?$/, 'validation:zip.invalid'),
    isPetFriendly: z.boolean(),
    isFurnished: z.boolean(),
    hasParking: z.boolean(),
    availableAt: z.string(),
});

/** A rental needs its move-in day, a home for sale has none — the backend's superRefine, mirrored (FORM-1). */
export const listingFormSchema = listingFormShape.superRefine((values, context) => {
    if (values.kind === 'RENT' && !/^\d{4}-\d{2}-\d{2}$/.test(values.availableAt)) {
        context.addIssue({
            code: 'custom',
            path: ['availableAt'],
            message: 'validation:availableAt.invalid',
        });
    }
});
export const LISTING_FORM_FIELDS = Object.keys(listingFormShape.shape);

export type ListingFormValues = z.input<typeof listingFormSchema>;
export type ListingFormOutput = z.output<typeof listingFormSchema>;

export const BED_FILTER_OPTIONS = ['0', '1', '2', '3', '4'] as const;
export const BATH_FILTER_OPTIONS = ['1', '1.5', '2', '3'] as const;
export const PRICE_FILTER_MAX_DIGITS = 9;
