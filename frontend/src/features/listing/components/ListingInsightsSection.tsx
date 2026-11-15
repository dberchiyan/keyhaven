import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useInsightPeriod } from '../hooks/useInsightPeriod';
import { useListingInsights } from '../hooks/useListingQueries';
import { InsightPeriodToggle } from './InsightPeriodToggle';
import { InsightsOverview } from './InsightsOverview';

export interface ListingInsightsSectionProps {
  listingId: string;
}

/** One home's views and saves over 7 / 30 / 90 days, on its management page. */
export function ListingInsightsSection({ listingId }: ListingInsightsSectionProps) {
  const { t } = useTranslation('listing');
  const { period, setPeriod } = useInsightPeriod();
  const insights = useListingInsights(listingId, period);
  return (
    <Card variant="outlined" component="section" aria-labelledby="listing-insights-heading">
      <CardContent className="flex flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <Typography id="listing-insights-heading" variant="h6" component="h2">
              {t('insights.listingTitle')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t('insights.listingHint')}
            </Typography>
          </div>
          <InsightPeriodToggle period={period} onChange={setPeriod} />
        </div>
        <InsightsOverview
          id="listing-insights"
          insights={insights.data}
          period={period}
          isPending={insights.isFetching}
          error={insights.error}
          onRetry={() => void insights.refetch()}
        />
      </CardContent>
    </Card>
  );
}
