import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess } from '@/features/auth';

import { useInsightParams } from '../hooks/use-insight-params';
import { useManagedInsights } from '../hooks/use-managed-listing-queries';
import { InsightPeriodToggle } from './insight-period-toggle';
import { InsightsOverview } from './insights-overview';
import { TopListings } from './top-listings';

/** The dashboard's insights: the scope's views and saves over 7 / 30 / 90 days and its busiest homes. */
export function InsightsPanel(): ReactElement {
    const { t } = useTranslation('listing');
    const { canAccess } = useAccess();
    const { period, setPeriod } = useInsightParams();
    const insights = useManagedInsights(period);
    return (
        <Card variant="outlined" component="section" aria-labelledby="insights-heading">
            <CardContent className="flex flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-2">
                        <Typography id="insights-heading" variant="h6" component="h2">
                            {t('insights.title')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {canAccess('listing.suspend') ? t('insights.titleHintAll') : t('insights.titleHint')}
                        </Typography>
                    </div>
                    <InsightPeriodToggle period={period} onChange={setPeriod} />
                </div>
                <InsightsOverview
                    idPrefix="insights"
                    insights={insights.data}
                    period={period}
                    isPending={insights.isFetching}
                    error={insights.error}
                    onRetry={() => void insights.refetch()}
                />
                {insights.data && <TopListings rows={insights.data.top} />}
            </CardContent>
        </Card>
    );
}
