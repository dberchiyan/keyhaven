import { z } from 'zod';

import {
    AMOUNT_INPUT_MAX_LENGTH,
    CITY_SLUG_MAX_LENGTH,
    MAX_BEDROOMS,
    SEARCH_TEXT_MAX_LENGTH,
} from '@/common/dto/limits';

export const SavedSearchCriteriaSchema = z.object({
    kind: z.enum(['RENT', 'SALE']).optional(),
    type: z.enum(['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'STUDIO']).optional(),
    city: z
        .string()
        .max(CITY_SLUG_MAX_LENGTH)
        .regex(/^[a-z0-9-]+$/)
        .optional(),
    priceMin: z
        .string()
        .max(AMOUNT_INPUT_MAX_LENGTH)
        .regex(/^\d{1,9}(\.\d{1,2})?$/)
        .optional(),
    priceMax: z
        .string()
        .max(AMOUNT_INPUT_MAX_LENGTH)
        .regex(/^\d{1,9}(\.\d{1,2})?$/)
        .optional(),
    beds: z.number().int().min(0).max(MAX_BEDROOMS).optional(),
    baths: z
        .string()
        .regex(/^\d{1,2}(\.5)?$/)
        .optional(),
    isPetFriendly: z.boolean().optional(),
    isFurnished: z.boolean().optional(),
    hasParking: z.boolean().optional(),
    moveInAt: z.iso.date().optional(),
    q: z.string().max(SEARCH_TEXT_MAX_LENGTH).optional(),
});
export type SavedSearchCriteria = z.infer<typeof SavedSearchCriteriaSchema>;
