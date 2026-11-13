import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SavedSearchCriteriaSchema } from '../../service/saved-search-criteria';

export const SavedSearchSchema = z
  .object({
    id: z.uuid(),
    name: z.string().max(80),
    criteria: SavedSearchCriteriaSchema.meta({ id: 'SavedSearchCriteria' }),
    emailAlerts: z.boolean(),
    /** When the last digest went out; null before the first. */
    lastNotifiedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    version: z.number().int().min(0),
  })
  .meta({ id: 'SavedSearch' });

export class SavedSearchResponse extends createZodDto(z.object(SavedSearchSchema.shape)) {}

export class SavedSearchListResponse extends createZodDto(
  z.object({ content: z.array(SavedSearchSchema).max(20) }),
) {}

/** What a digest run did (admins). */
export class DigestSummaryResponse extends createZodDto(
  z.object({ searches: z.number().int().min(0), emails: z.number().int().min(0) }),
) {}
