import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { DEFAULT_SLOT_DAYS, MAX_SLOT_DAYS } from '@/modules/viewing/service/viewing-limits';
import { VIEWING_STATUSES } from '@/modules/viewing/service/viewing-status';

const booleanParam = z.enum(['true', 'false'], { error: 'validation.invalid' }).transform((value) => value === 'true');

export const ViewingSlotsQuerySchema = z.object({
    from: z.iso.date({ error: 'validation.invalid' }).optional(),
    days: z.coerce.number({ error: 'validation.invalid' }).int().min(1).max(MAX_SLOT_DAYS).default(DEFAULT_SLOT_DAYS),
});
export class ViewingSlotsQuery extends createZodDto(ViewingSlotsQuerySchema) {}

export const ManagedViewingFilterQuerySchema = z.object({
    status: z.enum(VIEWING_STATUSES, { error: 'validation.invalid' }).optional(),
    listingId: z.uuid({ error: 'validation.invalid' }).optional(),
    isUpcoming: booleanParam.optional(),
});
export class ManagedViewingFilterQuery extends createZodDto(ManagedViewingFilterQuerySchema) {}
