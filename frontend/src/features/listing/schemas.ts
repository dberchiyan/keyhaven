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

const optionalText = (max: number, tooLong: string) =>
    z
        .string()
        .trim()
        .max(max, tooLong)
        .transform((value) => (value.length > 0 ? value : null));

/** Counts typed into a field: digits only, validated before they become numbers. */
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
    /** For rent (the price is a monthly rent) or for sale (the asking price). */
    kind: z.enum(LISTING_KINDS, { error: 'validation:kind.required' }),
    /** Money stays a string (data.md): whole dollars or two places. */
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
    petsAllowed: z.boolean(),
    furnished: z.boolean(),
    parking: z.boolean(),
    /** The move-in day: required for a rental, ignored for a home for sale. */
    availableFrom: z.string(),
});

/** A rental needs its move-in day — the cross-field rule mirrors the backend's superRefine. */
export const listingFormSchema = listingFormShape.superRefine((values, context) => {
    if (values.kind === 'RENT' && !/^\d{4}-\d{2}-\d{2}$/.test(values.availableFrom)) {
        context.addIssue({
            code: 'custom',
            path: ['availableFrom'],
            message: 'validation:availableFrom.invalid',
        });
    }
});
export const LISTING_FORM_FIELDS = Object.keys(listingFormShape.shape);

export type ListingFormValues = z.input<typeof listingFormSchema>;
export type ListingFormOutput = z.output<typeof listingFormSchema>;

/** The form's own messages, told apart from a server message by this guard. */
const MESSAGE_SET: ReadonlySet<string> = new Set([
    'validation:title.required',
    'validation:title.tooLong',
    'validation:description.required',
    'validation:description.tooLong',
    'validation:propertyType.required',
    'validation:kind.required',
    'validation:amount.invalid',
    'validation:bedrooms.invalid',
    'validation:bathrooms.invalid',
    'validation:sizeSqft.invalid',
    'validation:addressLine1.required',
    'validation:addressLine1.tooLong',
    'validation:addressLine2.tooLong',
    'validation:city.required',
    'validation:neighborhood.tooLong',
    'validation:zip.invalid',
    'validation:availableFrom.invalid',
]);
export const isListingValidationMessage = (message: string): message is 'validation:title.required' =>
    MESSAGE_SET.has(message);

/** Mirrors backend CreateSavedSearchRequestSchema (saved-search/controller/dto/saved-search.request.ts). */
export const SAVED_SEARCH_NAME_MAX_LENGTH = 80;
