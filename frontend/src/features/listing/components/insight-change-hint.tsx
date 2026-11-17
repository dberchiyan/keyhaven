import TrendingDownOutlined from '@mui/icons-material/TrendingDownOutlined';
import TrendingFlatOutlined from '@mui/icons-material/TrendingFlatOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { PERCENT } from '@/shared/lib/units';

const FLAT_PERCENT = 3;

export interface InsightChangeHintProps {
    current: number;
    previous: number;
    period: number;
}

type Trend = 'up' | 'flat' | 'down';

const TREND_ICONS = { up: TrendingUpOutlined, flat: TrendingFlatOutlined, down: TrendingDownOutlined } as const;

const trendOf = (percent: number): Trend => {
    if (Math.abs(percent) < FLAT_PERCENT) {
        return 'flat';
    }
    return percent > 0 ? 'up' : 'down';
};

/**
 * "+24% vs the previous 30 days" — the sign is in the text and the arrow, never the colour alone
 * (QRY-21, A11Y-6); within ±3 % the arrow is flat. The arrow sits on the first line when the
 * sentence wraps in a narrow tile.
 */
export function InsightChangeHint({ current, previous, period }: InsightChangeHintProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    if (previous === 0) {
        return (
            <Typography variant="caption" color="textSecondary">
                {current === 0 ? t('insights.changeNone') : t('insights.changeNew', { days: period })}
            </Typography>
        );
    }
    const percent = Math.round(((current - previous) / previous) * PERCENT);
    const Icon = TREND_ICONS[trendOf(percent)];
    const formatted = new Intl.NumberFormat(i18n.language, {
        style: 'percent',
        signDisplay: 'exceptZero',
        maximumFractionDigits: 0,
    }).format(percent / PERCENT);
    return (
        <Typography variant="caption" color="textSecondary" className="app-tabular inline-flex items-start gap-1">
            <Icon aria-hidden fontSize="inherit" className="mt-0.5 shrink-0" />
            <span>{t('insights.change', { percent: formatted, days: period })}</span>
        </Typography>
    );
}
