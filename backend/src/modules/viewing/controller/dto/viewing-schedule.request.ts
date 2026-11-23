import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ViewingScheduleSchema } from '@/modules/viewing/service/viewing-schedule';

export const SaveViewingScheduleRequestSchema = ViewingScheduleSchema.safeExtend({
    version: z.number({ error: 'validation.invalid' }).int().min(0).nullable(),
});
export class SaveViewingScheduleRequest extends createZodDto(SaveViewingScheduleRequestSchema) {}
