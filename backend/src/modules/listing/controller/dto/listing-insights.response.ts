import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { INSIGHT_TOP_LIMIT } from '../../service/insight-period';
import { ManagedListingCardSchema } from './listing.response';

/** Views and saves of one UTC day. */
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

/** How a listing (or the caller's whole dashboard) did over the window. */
export const ListingInsightsSchema = z
    .object({
        /** The first and the last day of the window (UTC days). */
        from: z.iso.date(),
        to: z.iso.date(),
        /** Days in the window: 7, 30 or 90. */
        period: z.number().int().min(7).max(90),
        /** One point per day, oldest first; quiet days are zero. */
        series: z.array(InsightPointSchema).max(90),
        totals: InsightTotalsSchema,
        /** The same window one period earlier. */
        previous: InsightTotalsSchema,
    })
    .meta({ id: 'ListingInsights' });

/** A listing that drew interest in the window, with its counts within it. */
const InsightTopListingSchema = z
    .object({
        listing: ManagedListingCardSchema,
        views: z.number().int().min(0),
        saves: z.number().int().min(0),
    })
    .meta({ id: 'InsightTopListing' });

const ManagedInsightsSchema = z.object({
    ...ListingInsightsSchema.shape,
    /** The busiest listings of the window, views first. */
    top: z.array(InsightTopListingSchema).max(INSIGHT_TOP_LIMIT),
});

export class ListingInsightsResponse extends createZodDto(z.object(ListingInsightsSchema.shape)) {}
export class ManagedInsightsResponse extends createZodDto(ManagedInsightsSchema) {}

/** Plain body types for the mappers (a DTO class instance must not be spread). */
export type ListingInsightsBody = z.infer<typeof ListingInsightsSchema>;
export type ManagedInsightsBody = z.infer<typeof ManagedInsightsSchema>;
