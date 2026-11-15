import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { DEFAULT_INSIGHT_PERIOD, type InsightPeriod } from '../../service/insight-period';

/** `?period=` of the insights endpoints: the window in days, today included. */
export const InsightsQuerySchema = z.object({
  period: z
    .enum(['7', '30', '90'], { error: 'validation.invalid' })
    .default(String(DEFAULT_INSIGHT_PERIOD) as '7' | '30' | '90')
    .transform((value): InsightPeriod => (value === '7' ? 7 : value === '90' ? 90 : 30)),
});

export class InsightsQuery extends createZodDto(InsightsQuerySchema) {}
