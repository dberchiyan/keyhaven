import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/shared/components/error-state';

import { formatDay } from '../format';
import type { InsightPeriod, ListingInsights } from '../types';
import { InsightBars } from './insight-bars';
import { InsightStats } from './insight-stats';
import { InsightsTable } from './insights-table';

export interface InsightsOverviewProps {
    idPrefix: string;
    insights: ListingInsights | undefined;
    period: InsightPeriod;
    isPending: boolean;
    error: unknown;
    onRetry: () => void;
}

/**
 * The three figures, a chart per series and, on request, the same figures as a table — the
 * accessible view of the charts (A11Y-6). The ids are prefixed because two blocks may share a page.
 */
export function InsightsOverview({
    idPrefix,
    insights,
    period,
    isPending,
    error,
    onRetry,
}: InsightsOverviewProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const [isTableShown, setIsTableShown] = useState(false);
    const number = new Intl.NumberFormat(i18n.language);
    const dayLabel = new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeZone: 'UTC',
    });
    if (error !== null && insights === undefined) {
        return <ErrorState error={error} onRetry={onRetry} />;
    }
    const tip = (point: { day: string; views: number; saves: number }): string =>
        t('insights.dayTip', {
            date: dayLabel.format(new Date(`${point.day}T00:00:00Z`)),
            views: number.format(point.views),
            saves: number.format(point.saves),
        });
    const isQuiet = insights !== undefined && insights.totals.views === 0 && insights.totals.saves === 0;
    return (
        <div className="flex flex-col gap-4" aria-busy={isPending}>
            <InsightStats insights={insights} period={period} />
            {insights ? (
                <>
                    <Typography variant="caption" color="textSecondary">
                        {t('insights.range', {
                            from: formatDay(insights.from, i18n.language),
                            to: formatDay(insights.to, i18n.language),
                        })}
                    </Typography>
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <InsightBars
                            id={`${idPrefix}-views`}
                            title={t('insights.views')}
                            tone="views"
                            points={insights.series}
                            value={(point) => point.views}
                            tip={tip}
                        />
                        <InsightBars
                            id={`${idPrefix}-saves`}
                            title={t('insights.saves')}
                            tone="saves"
                            points={insights.series}
                            value={(point) => point.saves}
                            tip={tip}
                        />
                    </div>
                    {isQuiet && (
                        <Typography variant="body2" color="textSecondary">
                            {t('insights.empty')}
                        </Typography>
                    )}
                    <div className="flex flex-col gap-4">
                        <Button
                            variant="text"
                            size="small"
                            aria-expanded={isTableShown}
                            aria-controls={`${idPrefix}-table`}
                            onClick={() => {
                                setIsTableShown((value) => !value);
                            }}
                            className="self-start"
                        >
                            {isTableShown ? t('insights.hideTable') : t('insights.showTable')}
                        </Button>
                        {isTableShown && (
                            <div id={`${idPrefix}-table`}>
                                <InsightsTable points={insights.series} />
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div role="status" className="flex flex-col gap-4">
                    <span className="sr-only">{t('insights.loading')}</span>
                    <Skeleton variant="rounded" className="h-36 w-full" />
                </div>
            )}
        </div>
    );
}
