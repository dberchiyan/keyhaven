import BedOutlined from '@mui/icons-material/BedOutlined';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { listingPath } from '@/shared/lib/paths';

import { formatAvailability, formatBaths, formatBeds, formatPrice, formatSize } from '../format';
import { usePrefetchListing } from '../hooks/use-listing-queries';
import type { ListingCard as ListingCardData } from '../types';
import { InterestCounts } from './interest-counts';
import { SaveButton } from './save-button';

export interface ListingCardProps {
    listing: ListingCardData;
}

/**
 * One search result. The title is a stretched link so the whole card opens the home while the name
 * stays the one `<a>` (A11Y-1); the heart sits above it as its own control, and the photo box
 * keeps its ratio so the grid never shifts while pictures arrive.
 */
export function ListingCard({ listing }: ListingCardProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const prefetch = usePrefetchListing();
    const where = [listing.neighborhood, `${listing.city.name}, ${listing.city.state}`].filter(Boolean).join(' · ');
    return (
        <Card variant="outlined" component="article" className="relative flex h-full flex-col">
            <SaveButton
                listingId={listing.id}
                saved={listing.isSaved}
                title={listing.title}
                className="absolute top-2 right-2 z-10"
            />
            <div className="aspect-4/3 w-full overflow-hidden bg-badge-neutral-background">
                {listing.coverPhotoUrl ? (
                    <img
                        src={listing.coverPhotoUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={1200}
                        height={800}
                        className="size-full object-cover"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <BedOutlined aria-hidden fontSize="large" className="text-text-disabled" />
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
                <Typography variant="h6" component="p" className="app-tabular">
                    {formatPrice(listing, i18n.language, t)}
                </Typography>
                <Typography variant="subtitle2" component="h2" className="truncate">
                    <Link
                        to={listingPath(listing.id)}
                        aria-label={t('card.open', { title: listing.title })}
                        onMouseEnter={() => {
                            prefetch(listing.id);
                        }}
                        onFocus={() => {
                            prefetch(listing.id);
                        }}
                        className="text-inherit no-underline after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
                    >
                        {listing.title}
                    </Link>
                </Typography>
                <Typography variant="body2" color="textSecondary" className="app-tabular">
                    {[
                        formatBeds(listing.bedrooms, t),
                        formatBaths(listing.bathrooms, t),
                        formatSize(listing.sizeSqft, i18n.language, t),
                    ].join(' · ')}
                </Typography>
                <Typography variant="body2" color="textSecondary" className="truncate">
                    {where}
                </Typography>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                    <Typography
                        variant="caption"
                        component="span"
                        className="rounded-full bg-badge-active-background px-2.5 py-1 whitespace-nowrap text-badge-active-text"
                    >
                        {formatAvailability(listing, i18n.language, t)}
                    </Typography>
                    <Typography variant="caption" component="span" color="textSecondary">
                        <InterestCounts views={listing.viewCount} />
                    </Typography>
                </div>
            </div>
        </Card>
    );
}
