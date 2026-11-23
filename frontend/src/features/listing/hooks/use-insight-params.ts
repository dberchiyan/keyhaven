import { useSearchParams } from 'react-router';
import { z } from 'zod';

import { DEFAULT_INSIGHT_PERIOD, INSIGHT_PERIODS, type InsightPeriod } from '../types';

const urlSchema = z.object({
    period: z.coerce
        .number()
        .pipe(z.union(INSIGHT_PERIODS.map((period) => z.literal(period))))
        .catch(DEFAULT_INSIGHT_PERIOD),
});

export interface InsightParams {
    period: InsightPeriod;
    setPeriod: (period: InsightPeriod) => void;
}

/**
 * The insights' window (`?period=7|30|90`) lives in the URL beside the dashboard's filters, so a
 * link reopens the same chart; nonsense falls back to the default.
 */
export const useInsightParams = (): InsightParams => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { period } = urlSchema.parse({ period: searchParams.get('period') ?? undefined });
    return {
        period,
        setPeriod: (next) => {
            setSearchParams(
                (current) => {
                    const params = new URLSearchParams(current);
                    if (next === DEFAULT_INSIGHT_PERIOD) {
                        params.delete('period');
                        return params;
                    }
                    params.set('period', String(next));
                    return params;
                },
                { replace: true },
            );
        },
    };
};
