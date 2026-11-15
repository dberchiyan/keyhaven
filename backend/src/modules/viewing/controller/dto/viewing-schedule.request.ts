import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ViewingScheduleSchema } from '../../service/viewing-schedule';

/** The whole document replaces the listing's hours; `version` is the one the owner edited (null: none yet). */
export const SaveViewingScheduleRequestSchema = ViewingScheduleSchema.safeExtend({
  version: z.number({ error: 'validation.invalid' }).int().min(0).nullable(),
});
export class SaveViewingScheduleRequest extends createZodDto(SaveViewingScheduleRequestSchema) {}
