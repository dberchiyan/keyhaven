import TrendingDownOutlined from '@mui/icons-material/TrendingDownOutlined';
import TrendingFlatOutlined from '@mui/icons-material/TrendingFlatOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { StatCard } from '@/shared/components/StatCard';
import type { ListingInsights } from '../types';

/** Within this many percent either way the period reads as "about the same". */
const FLAT_PERCENT = 3;

interface ChangeHintProps {
    current: number;
    previous: number;
    period: number;
}

/** "+24% vs the previous 30 days" with an arrow — the sign is in the text, never the colour alone. */
function ChangeHint({ current, previous, period }: ChangeHintProps) {
    const { t, i18n } = useTranslation('listing');
    if (previous === 0) {
        return (
            <Typography variant="caption" color="textSecondary">
                {current === 0 ? t('insights.changeNone') : t('insights.changeNew', { days: period })}
            </Typography>
        );
    }
    const percent = Math.round(((current - previous) / previous) * 100);
    const Icon =
        Math.abs(percent) < FLAT_PERCENT
            ? TrendingFlatOutlined
            : percent > 0
              ? TrendingUpOutlined
              : TrendingDownOutlined;
    const formatted = new Intl.NumberFormat(i18n.language, {
        style: 'percent',
        signDisplay: 'exceptZero',
        maximumFractionDigits: 0,
    }).format(percent / 100);
    return (
        <Typography variant="caption" color="textSecondary" className="app-tabular inline-flex items-start gap-1">
            {/* The arrow sits on the first line when the sentence wraps (a narrow tile). */}
            <Icon aria-hidden fontSize="inherit" className="mt-0.5 shrink-0" />
            <span>{t('insights.change', { percent: formatted, days: period })}</span>
        </Typography>
    );
}

export interface InsightStatsProps {
    insights: ListingInsights | undefined;
    period: number;
}

/** Views, saves and the share of views that ended in a save, each against the period before. */
export function InsightStats({ insights, period }: InsightStatsProps) {
    const { t, i18n } = useTranslation('listing');
    const number = new Intl.NumberFormat(i18n.language);
    const rate = (totals: { views: number; saves: number }): number | null =>
        totals.views > 0 ? totals.saves / totals.views : null;
    const current = insights ? rate(insights.totals) : null;
    const previous = insights ? rate(insights.previous) : null;
    const percent = new Intl.NumberFormat(i18n.language, {
        style: 'percent',
        maximumFractionDigits: 1,
    });
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
                title={t('insights.views')}
                value={insights ? number.format(insights.totals.views) : undefined}
                hint={
                    insights && (
                        <ChangeHint
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
                        <ChangeHint
                            current={insights.totals.saves}
                            previous={insights.previous.saves}
                            period={period}
                        />
                    )
                }
            />
            <StatCard
                title={t('insights.saveRate')}
                value={insights ? (current === null ? t('insights.noRate') : percent.format(current)) : undefined}
                hint={
                    insights && (
                        <Typography variant="caption" color="textSecondary">
                            {current === null
                                ? t('insights.saveRateHint')
                                : previous === null
                                  ? t('insights.saveRateOf', {
                                        saves: number.format(insights.totals.saves),
                                        views: number.format(insights.totals.views),
                                    })
                                  : t('insights.saveRatePrevious', {
                                        rate: percent.format(previous),
                                        days: period,
                                    })}
                        </Typography>
                    )
                }
            />
        </div>
    );
}
