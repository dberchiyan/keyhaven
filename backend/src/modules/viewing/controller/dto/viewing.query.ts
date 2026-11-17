import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MAX_SLOT_DAYS } from '../../service/viewing-limits';
import { VIEWING_STATUSES } from '../../service/viewing-status';

const booleanParam = z.enum(['true', 'false'], { error: 'validation.invalid' }).transform((value) => value === 'true');

/** `?from=YYYY-MM-DD&days=7`: the local days (the city's) to list slots for, 14 at most. */
export const ViewingSlotsQuerySchema = z.object({
    from: z.iso.date({ error: 'validation.invalid' }).optional(),
    days: z.coerce.number({ error: 'validation.invalid' }).int().min(1).max(MAX_SLOT_DAYS).default(7),
});
export class ViewingSlotsQuery extends createZodDto(ViewingSlotsQuerySchema) {}

/** The dashboard's filters: a status, one home, only what lies ahead. */
export const ManagedViewingFilterQuerySchema = z.object({
    status: z.enum(VIEWING_STATUSES, { error: 'validation.invalid' }).optional(),
    listingId: z.uuid({ error: 'validation.invalid' }).optional(),
    upcoming: booleanParam.optional(),
});
export class ManagedViewingFilterQuery extends createZodDto(ManagedViewingFilterQuerySchema) {}
