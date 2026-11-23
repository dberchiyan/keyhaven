import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { ListingInsights } from '../types';
import { InsightChangeHint } from './insight-change-hint';
import { StatCard } from './stat-card';

export interface InsightStatsProps {
    insights: ListingInsights | undefined;
    period: number;
}

interface Totals {
    views: number;
    saves: number;
}

const saveRate = (totals: Totals): number | undefined => (totals.views > 0 ? totals.saves / totals.views : undefined);

/**
 * Views, saves and the save rate, each against the period before. The rate is computed here from
 * the integer totals rather than sent by the API, so it can never disagree with them.
 */
export function InsightStats({ insights, period }: InsightStatsProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const number = new Intl.NumberFormat(i18n.language);
    const current = insights ? saveRate(insights.totals) : undefined;
    const previous = insights ? saveRate(insights.previous) : undefined;
    const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 1 });
    const rateHint = (data: ListingInsights): string => {
        if (current === undefined) {
            return t('insights.saveRateHint');
        }
        if (previous === undefined) {
            return t('insights.saveRateOf', {
                saves: number.format(data.totals.saves),
                views: number.format(data.totals.views),
            });
        }
        return t('insights.saveRatePrevious', { rate: percent.format(previous), days: period });
    };
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard
                title={t('insights.views')}
                value={insights ? number.format(insights.totals.views) : undefined}
                hint={
                    insights && (
                        <InsightChangeHint
                            current={insights.totals.views}
                            previous={insights.previous.views}
                            period={period}
                        />
                    )
                }
            />
            <StatCard
                title={t('insights.saves')}
                value={insights ? number.format(insights.totals.saves) : undefined}
                hint={
                    insights && (
                        <InsightChangeHint
                            current={insights.totals.saves}
                            previous={insights.previous.saves}
                            period={period}
                        />
                    )
                }
            />
            <StatCard
                title={t('insights.saveRate')}
                value={insights && (current === undefined ? t('insights.noRate') : percent.format(current))}
                hint={
                    insights && (
                        <Typography variant="caption" color="textSecondary">
                            {rateHint(insights)}
                        </Typography>
                    )
                }
            />
        </div>
    );
}
