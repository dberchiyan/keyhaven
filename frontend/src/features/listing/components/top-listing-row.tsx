import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { managedListingPath } from '@/shared/lib/paths';
import { PERCENT } from '@/shared/lib/units';

import type { ManagedInsights } from '../types';
import { ListingStatusBadge } from './listing-status-badge';

const MIN_SHARE_PERCENT = 4;
const COVER_PX = 88;

export interface TopListingRowProps {
    row: ManagedInsights['top'][number];
    rank: number;
    peakViews: number;
}

/**
 * One ranked home: a stretched link on the title opens it (A11Y-1), and a bar shows its share of
 * the busiest home's views — the ranking at a glance; the figures beside it say the same in words.
 */
export function TopListingRow({ row, rank, peakViews }: TopListingRowProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const number = new Intl.NumberFormat(i18n.language);
    const { listing, views, saves } = row;
    const share = peakViews > 0 ? Math.max(MIN_SHARE_PERCENT, Math.round((views / peakViews) * PERCENT)) : 0;
    return (
        <li className="hover:bg-action-hover relative flex items-center gap-3 rounded-md px-2 py-2">
            <Typography
                variant="subtitle2"
                component="span"
                color="textSecondary"
                className="app-tabular w-5 shrink-0 text-right"
            >
                {rank}
            </Typography>
            <div className="size-11 shrink-0 overflow-hidden rounded-md bg-badge-neutral-background">
                {listing.coverPhotoUrl && (
                    <img
                        src={listing.coverPhotoUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={COVER_PX}
                        height={COVER_PX}
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
                        {t('insights.topCell', { views: number.format(views), saves: number.format(saves) })}
                    </Typography>
                </div>
                <div className="flex items-center gap-2">
                    <div aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-background">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                    </div>
                    <Typography variant="caption" color="textSecondary" className="w-24 shrink-0 truncate">
                        {`${listing.city.name}, ${listing.city.state}`}
                    </Typography>
                    {listing.status !== 'PUBLISHED' && <ListingStatusBadge status={listing.status} />}
                </div>
            </div>
        </li>
    );
}
