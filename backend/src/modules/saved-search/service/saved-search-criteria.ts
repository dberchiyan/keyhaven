import { z } from 'zod';

/**
 * The filters a saved search keeps — a JSON document in `saved_searches.criteria`, validated by
 * this schema on write and on read (data.md → JSON). The same shape as the search page's query.
 */
export const SavedSearchCriteriaSchema = z.object({
  /** Homes for rent (the default) or for sale. */
  kind: z.enum(['RENT', 'SALE']).optional(),
  type: z.enum(['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'STUDIO']).optional(),
  city: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  priceMin: z
    .string()
    .max(16)
    .regex(/^\d{1,9}(\.\d{1,2})?$/)
    .optional(),
  priceMax: z
    .string()
    .max(16)
    .regex(/^\d{1,9}(\.\d{1,2})?$/)
    .optional(),
  beds: z.number().int().min(0).max(20).optional(),
  baths: z
    .string()
    .regex(/^\d{1,2}(\.5)?$/)
    .optional(),
  pets: z.boolean().optional(),
  furnished: z.boolean().optional(),
  parking: z.boolean().optional(),
  availableBy: z.iso.date().optional(),
  q: z.string().max(100).optional(),
});
export type SavedSearchCriteria = z.infer<typeof SavedSearchCriteriaSchema>;
