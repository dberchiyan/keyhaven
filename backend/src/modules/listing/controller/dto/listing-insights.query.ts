import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { DEFAULT_INSIGHT_PERIOD, toInsightPeriod } from '@/modules/listing/service/insight-period';

export const InsightsQuerySchema = z.object({
    period: z
        .enum(['7', '30', '90'], { error: 'validation.invalid' })
        .default(String(DEFAULT_INSIGHT_PERIOD) as '7' | '30' | '90')
        .transform(toInsightPeriod),
});

export class InsightsQuery extends createZodDto(InsightsQuerySchema) {}
