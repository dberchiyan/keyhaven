import { DAYS_PER_WEEK } from '@/common/time/units';

const MONTH_PERIOD_DAYS = 30;
const QUARTER_PERIOD_DAYS = 90;

export const INSIGHT_PERIODS = [DAYS_PER_WEEK, MONTH_PERIOD_DAYS, QUARTER_PERIOD_DAYS] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];

export const MIN_INSIGHT_PERIOD = DAYS_PER_WEEK;
export const MAX_INSIGHT_PERIOD = QUARTER_PERIOD_DAYS;
export const DEFAULT_INSIGHT_PERIOD: InsightPeriod = MONTH_PERIOD_DAYS;

/** DATA-8: the dashboard's busiest listings are a short list, never a page. */
export const INSIGHT_TOP_LIMIT = 5;

/** The query carries the window as text; the enum already refused anything but the offered windows. */
export const toInsightPeriod = (value: string): InsightPeriod =>
    INSIGHT_PERIODS.find((period) => String(period) === value) ?? DEFAULT_INSIGHT_PERIOD;
