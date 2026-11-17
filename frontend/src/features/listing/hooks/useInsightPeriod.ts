import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { DEFAULT_INSIGHT_PERIOD, type InsightPeriod } from '../types';

/** The URL is the source of truth; anything malformed falls back to the default. */
const periodSchema = z.enum(['7', '30', '90']).catch(String(DEFAULT_INSIGHT_PERIOD) as '30');

const toPeriod = (value: '7' | '30' | '90'): InsightPeriod => (value === '7' ? 7 : value === '90' ? 90 : 30);

/** The insights' window (`?period=7|30|90`) lives in the URL, beside the dashboard's filters. */
export const useInsightPeriod = (): {
    period: InsightPeriod;
    setPeriod: (period: InsightPeriod) => void;
} => {
    const [searchParams, setSearchParams] = useSearchParams();
    const period = toPeriod(periodSchema.parse(searchParams.get('period') ?? undefined));
    const setPeriod = useCallback(
        (next: InsightPeriod): void => {
            setSearchParams(
                (current) => {
                    const params = new URLSearchParams(current);
                    if (next === DEFAULT_INSIGHT_PERIOD) {
                        params.delete('period');
                    } else {
                        params.set('period', String(next));
                    }
                    return params;
                },
                // Switching the window is a view change, not a step in the history.
                { replace: true },
            );
        },
        [setSearchParams],
    );
    return { period, setPeriod };
};
