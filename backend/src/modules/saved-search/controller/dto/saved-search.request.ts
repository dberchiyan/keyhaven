import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { SavedSearchCriteriaSchema } from '@/modules/saved-search/service/saved-search-criteria';

export const SAVED_SEARCH_NAME_MAX_LENGTH = 80;

const nameSchema = z
    .string({ error: 'validation.savedSearchName.required' })
    .trim()
    .min(1, 'validation.savedSearchName.required')
    .max(SAVED_SEARCH_NAME_MAX_LENGTH, 'validation.savedSearchName.tooLong');

export const CreateSavedSearchRequestSchema = z.object({
    name: nameSchema,
    criteria: SavedSearchCriteriaSchema.meta({ id: 'SavedSearchCriteria' }),
    hasEmailAlerts: z.boolean({ error: 'validation.invalid' }),
});

export class CreateSavedSearchRequest extends createZodDto(CreateSavedSearchRequestSchema) {}

export const UpdateSavedSearchRequestSchema = z.object({
    name: nameSchema,
    hasEmailAlerts: z.boolean({ error: 'validation.invalid' }),
    version: z.number({ error: 'validation.invalid' }).int().min(0),
});

export class UpdateSavedSearchRequest extends createZodDto(UpdateSavedSearchRequestSchema) {}
