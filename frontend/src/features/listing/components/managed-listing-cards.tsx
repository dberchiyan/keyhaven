import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { formatAvailability, formatBaths, formatBeds, formatPrice } from '../format';
import type { ManagedListingCard } from '../types';
import { InterestCounts } from './interest-counts';
import { ListingStatusBadge } from './listing-status-badge';
import { ManagedListingLink } from './managed-listing-link';
import { ShowcaseBadge } from './showcase-badge';

export interface ManagedListingCardsProps {
    listings: readonly ManagedListingCard[];
}

/** Phones: the same rows stacked — cover, title and status first, the figures under them. */
export function ManagedListingCards({ listings }: ManagedListingCardsProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    return (
        <ul className="m-0 flex list-none flex-col divide-y divide-divider p-0">
            {listings.map((listing) => (
                <li key={listing.id} className="relative flex items-start gap-4 p-4">
                    <div className="size-16 shrink-0 overflow-hidden rounded-md bg-badge-neutral-background">
                        {listing.coverPhotoUrl && (
                            <img
                                src={listing.coverPhotoUrl}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                width={128}
                                height={128}
                                className="size-full object-cover"
                            />
                        )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start gap-2">
                            <Typography variant="subtitle2" component="h3" className="line-clamp-2 flex-1">
                                <ManagedListingLink listingId={listing.id} title={listing.title} />
                            </Typography>
                            <span className="app-subtitle2 flex h-lh shrink-0 items-center text-text-secondary">
                                <ChevronRightOutlined aria-hidden fontSize="small" />
                            </span>
                        </div>
                        <Typography variant="body2" className="app-tabular">
                            {[
                                formatPrice(listing, i18n.language, t),
                                formatBeds(listing.bedrooms, t),
                                formatBaths(listing.bathrooms, t),
                            ].join(' · ')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" className="truncate">
                            {[listing.neighborhood, `${listing.city.name}, ${listing.city.state}`]
                                .filter(Boolean)
                                .join(' · ')}
                            {` · ${formatAvailability(listing, i18n.language, t)}`}
                        </Typography>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5">
                            <ListingStatusBadge status={listing.status} />
                            {listing.isDemo && <ShowcaseBadge />}
                            <Typography variant="caption" color="textSecondary">
                                <InterestCounts views={listing.viewCount} saves={listing.saveCount} />
                            </Typography>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}
