/** How far back the owner's insights look, in days (today included): the chart offers these three. */
export const INSIGHT_PERIODS = [7, 30, 90] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];

export const DEFAULT_INSIGHT_PERIOD: InsightPeriod = 30;

/** The busiest listings of the dashboard's insights: a short list, never a page. */
export const INSIGHT_TOP_LIMIT = 5;
