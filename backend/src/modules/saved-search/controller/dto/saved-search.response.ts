import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { SavedSearchCriteriaSchema } from '@/modules/saved-search/service/saved-search-criteria';
import { MAX_SAVED_SEARCHES } from '@/modules/saved-search/service/saved-search-limits';

import { SAVED_SEARCH_NAME_MAX_LENGTH } from './saved-search.request';

export const SavedSearchSchema = z
    .object({
        id: z.uuid(),
        name: z.string().max(SAVED_SEARCH_NAME_MAX_LENGTH),
        criteria: SavedSearchCriteriaSchema.meta({ id: 'SavedSearchCriteria' }),
        hasEmailAlerts: z.boolean(),
        lastNotifiedAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        version: z.number().int().min(0),
    })
    .meta({ id: 'SavedSearch' });

export class SavedSearchResponse extends createZodDto(z.object(SavedSearchSchema.shape)) {}

export class SavedSearchListResponse extends createZodDto(
    z.object({ content: z.array(SavedSearchSchema).max(MAX_SAVED_SEARCHES) }),
) {}

export class DigestSummaryResponse extends createZodDto(
    z.object({ searches: z.number().int().min(0), emails: z.number().int().min(0) }),
) {}
