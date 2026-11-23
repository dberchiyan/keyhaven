import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { INSIGHT_TOP_LIMIT, MAX_INSIGHT_PERIOD, MIN_INSIGHT_PERIOD } from '@/modules/listing/service/insight-period';

import { ManagedListingCardSchema } from './listing.response';

const InsightPointSchema = z
    .object({
        day: z.iso.date(),
        views: z.number().int().min(0),
        saves: z.number().int().min(0),
    })
    .meta({ id: 'InsightPoint' });

const InsightTotalsSchema = z
    .object({ views: z.number().int().min(0), saves: z.number().int().min(0) })
    .meta({ id: 'InsightTotals' });

export const ListingInsightsSchema = z
    .object({
        from: z.iso.date(),
        to: z.iso.date(),
        period: z.number().int().min(MIN_INSIGHT_PERIOD).max(MAX_INSIGHT_PERIOD),
        series: z.array(InsightPointSchema).max(MAX_INSIGHT_PERIOD),
        totals: InsightTotalsSchema,
        previous: InsightTotalsSchema,
    })
    .meta({ id: 'ListingInsights' });

const InsightTopListingSchema = z
    .object({
        listing: ManagedListingCardSchema,
        views: z.number().int().min(0),
        saves: z.number().int().min(0),
    })
    .meta({ id: 'InsightTopListing' });

const ManagedInsightsSchema = z.object({
    ...ListingInsightsSchema.shape,
    top: z.array(InsightTopListingSchema).max(INSIGHT_TOP_LIMIT),
});

export class ListingInsightsResponse extends createZodDto(z.object(ListingInsightsSchema.shape)) {}
export class ManagedInsightsResponse extends createZodDto(ManagedInsightsSchema) {}

export type ListingInsightsBody = z.infer<typeof ListingInsightsSchema>;
export type ManagedInsightsBody = z.infer<typeof ManagedInsightsSchema>;
