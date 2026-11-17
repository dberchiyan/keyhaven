import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

import { DEFAULT_INSIGHT_PERIOD, INSIGHT_PERIODS, type InsightPeriod } from '../types';

export interface UseInsightPeriodResult {
    period: InsightPeriod;
    setPeriod: (period: InsightPeriod) => void;
}

const parsePeriod = (raw: string | null): InsightPeriod =>
    INSIGHT_PERIODS.find((period) => String(period) === raw) ?? DEFAULT_INSIGHT_PERIOD;

/**
 * The insights' window (`?period=7|30|90`) lives in the URL beside the dashboard's filters, so a
 * link reopens the same chart; nonsense falls back to the default.
 */
export const useInsightPeriod = (): UseInsightPeriodResult => {
    const [searchParams, setSearchParams] = useSearchParams();
    const period = parsePeriod(searchParams.get('period'));
    const setPeriod = useCallback(
        (next: InsightPeriod): void => {
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
        [setSearchParams],
    );
    return { period, setPeriod };
};
