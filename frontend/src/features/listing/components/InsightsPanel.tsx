import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAccess } from '@/features/auth';
import { managedListingPath } from '@/shared/lib/paths';
import { useInsightPeriod } from '../hooks/useInsightPeriod';
import { useManagedInsights } from '../hooks/useListingQueries';
import type { ManagedInsights } from '../types';
import { InsightPeriodToggle } from './InsightPeriodToggle';
import { InsightsOverview } from './InsightsOverview';
import { ListingStatusBadge } from './ListingStatusBadge';

interface TopListingsProps {
    rows: ManagedInsights['top'];
}

/** The homes that drew the most interest in the window — a short list, the title opens the home. */
function TopListings({ rows }: TopListingsProps) {
    const { t, i18n } = useTranslation('listing');
    const number = new Intl.NumberFormat(i18n.language);
    return (
        <section aria-labelledby="insights-top-heading" className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
                <Typography id="insights-top-heading" variant="h6" component="h3">
                    {t('insights.top')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    {t('insights.topHint')}
                </Typography>
            </div>
            {rows.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                    {t('insights.topEmpty')}
                </Typography>
            ) : (
                <ol className="m-0 flex list-none flex-col gap-1 p-0">
                    {rows.map(({ listing, views, saves }, index) => {
                        const peak = rows[0]?.views ?? 0;
                        const share = peak > 0 ? Math.max(4, Math.round((views / peak) * 100)) : 0;
                        return (
                            <li
                                key={listing.id}
                                className="hover:bg-action-hover relative flex items-center gap-3 rounded-md px-2 py-2"
                            >
                                <Typography
                                    variant="subtitle2"
                                    component="span"
                                    color="textSecondary"
                                    className="app-tabular w-5 shrink-0 text-right"
                                >
                                    {index + 1}
                                </Typography>
                                <div className="size-11 shrink-0 overflow-hidden rounded-md bg-badge-neutral-background">
                                    {listing.coverPhotoUrl && (
                                        <img
                                            src={listing.coverPhotoUrl}
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            width={88}
                                            height={88}
                                            className="size-full object-cover"
                                        />
                                    )}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <Typography variant="subtitle2" component="span" className="truncate">
                                            <Link
                                                to={managedListingPath(listing.id)}
                                                aria-label={t('manage.open', { title: listing.title })}
                                                className="text-inherit no-underline after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-primary"
                                            >
                                                {listing.title}
                                            </Link>
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="textSecondary"
                                            className="app-tabular shrink-0 whitespace-nowrap"
                                        >
                                            {t('insights.topCell', {
                                                views: number.format(views),
                                                saves: number.format(saves),
                                            })}
                                        </Typography>
                                    </div>
                                    {/* The share of the busiest home's views, as a bar: the ranking at a glance. */}
                                    <div className="flex items-center gap-2">
                                        <div
                                            aria-hidden
                                            className="h-1 flex-1 overflow-hidden rounded-full bg-background"
                                        >
                                            <div
                                                className="h-full rounded-full bg-primary"
                                                style={{ width: `${share}%` }}
                                            />
                                        </div>
                                        <Typography
                                            variant="caption"
                                            color="textSecondary"
                                            className="w-24 shrink-0 truncate"
                                        >
                                            {`${listing.city.name}, ${listing.city.state}`}
                                        </Typography>
                                        {listing.status !== 'PUBLISHED' && (
                                            <ListingStatusBadge status={listing.status} />
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}

/** The dashboard's insights: the scope's views and saves over 7 / 30 / 90 days and its busiest homes. */
export function InsightsPanel() {
    const { t } = useTranslation('listing');
    const can = useAccess();
    const { period, setPeriod } = useInsightPeriod();
    const insights = useManagedInsights(period);
    return (
        <Card variant="outlined" component="section" aria-labelledby="insights-heading">
            <CardContent className="flex flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-0.5">
                        <Typography id="insights-heading" variant="h6" component="h2">
                            {t('insights.title')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {can('listing.suspend') ? t('insights.titleHintAll') : t('insights.titleHint')}
                        </Typography>
                    </div>
                    <InsightPeriodToggle period={period} onChange={setPeriod} />
                </div>
                <InsightsOverview
                    id="insights"
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
