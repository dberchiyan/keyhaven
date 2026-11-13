import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { managedListingPath } from '@/shared/lib/paths';
import { formatAvailability, formatBaths, formatBeds, formatPrice } from '../format';
import type { ManagedListingCard } from '../types';
import { ListingStatusBadge } from './ListingStatusBadge';
import { ShowcaseBadge } from './ShowcaseBadge';

export interface ManagedListingCardsProps {
  listings: readonly ManagedListingCard[];
}

/** Phones: the same rows stacked as cards. */
export function ManagedListingCards({ listings }: ManagedListingCardsProps) {
  const { t, i18n } = useTranslation('listing');
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-divider p-0">
      {listings.map((listing) => (
        <li key={listing.id} className="relative flex gap-3 p-4">
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
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Typography variant="subtitle2" component="h3" className="line-clamp-2">
              <Link
                to={managedListingPath(listing.id)}
                aria-label={t('manage.open', { title: listing.title })}
                className="text-inherit no-underline after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-primary"
              >
                {listing.title}
              </Link>
            </Typography>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Typography variant="body2" color="textSecondary" className="app-tabular">
                {[
                  formatPrice(listing, i18n.language, t),
                  formatBeds(listing.bedrooms, t),
                  formatBaths(listing.bathrooms, t),
                ].join(' · ')}
              </Typography>
              <ListingStatusBadge status={listing.status} />
              {listing.demo && <ShowcaseBadge />}
            </div>
            <Typography variant="caption" color="textSecondary">
              {`${listing.city.name}, ${listing.city.state} · ${formatAvailability(listing, i18n.language, t)}`}
            </Typography>
            <Typography variant="caption" color="textSecondary" className="app-tabular">
              {t('manage.table.interestCell', {
                views: listing.viewCount,
                saves: listing.saveCount,
              })}
            </Typography>
          </div>
        </li>
      ))}
    </ul>
  );
}
