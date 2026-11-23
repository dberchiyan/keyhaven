import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { listingPath, managedListingPath } from '@/shared/lib/paths';

import { type DisplayStatus, formatSlot } from '../format';
import type { ViewingAudience } from '../hooks/use-viewing-card';
import type { Viewing } from '../types';
import { ViewingStatusBadge } from './viewing-status-badge';

export interface ViewingCardHeadingProps {
    viewing: Viewing;
    audience: ViewingAudience;
    status: DisplayStatus;
    hideListing: boolean;
}

const COVER_PX = 112;

/**
 * The row's heading: the home (cover, title linking to the owner's or the public page, place) —
 * or, where the page is already the home's, who asked or when. The status sits on the right from
 * `sm`; the time block carries it on a phone.
 */
export function ViewingCardHeading({ viewing, audience, status, hideListing }: ViewingCardHeadingProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const { listing, tenant } = viewing;
    const place = [listing.neighborhood, `${listing.city.name}, ${listing.city.state}`].filter(Boolean).join(' · ');
    const to = audience === 'owner' ? managedListingPath(listing.id) : listingPath(listing.id);
    const ownTitle =
        audience === 'owner' && tenant
            ? `${tenant.firstName} ${tenant.lastName}`
            : formatSlot(viewing.startsAt, listing.city.timeZone, i18n.language);

    return (
        <div className="flex items-start gap-4">
            {!hideListing && (
                <div className="size-14 shrink-0 overflow-hidden rounded-md bg-badge-neutral-background">
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
            )}
            <div className="flex min-w-0 flex-1 flex-col">
                {hideListing ? (
                    <Typography variant="subtitle1" component="h3" className="truncate">
                        {ownTitle}
                    </Typography>
                ) : (
                    <>
                        <Typography variant="subtitle1" component="h3" className="line-clamp-2">
                            <Link component={RouterLink} to={to} underline="hover" color="inherit">
                                {listing.title}
                            </Link>
                        </Typography>
                        <Typography variant="body2" color="textSecondary" className="truncate">
                            {place}
                        </Typography>
                    </>
                )}
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
                <ViewingStatusBadge status={status} />
                {viewing.status === 'CANCELLED' && viewing.cancelledBy && (
                    <Typography variant="caption" color="textSecondary">
                        {t(`card.cancelledBy.${viewing.cancelledBy}`)}
                    </Typography>
                )}
            </div>
        </div>
    );
}
