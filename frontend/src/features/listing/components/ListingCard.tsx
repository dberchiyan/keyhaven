import BedOutlined from '@mui/icons-material/BedOutlined';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { listingPath } from '@/shared/lib/paths';
import { formatBaths, formatBeds, formatDay, formatRent, formatSize } from '../format';
import type { ListingCard as ListingCardData } from '../types';
import { SaveButton } from './SaveButton';

export interface ListingCardProps {
  listing: ListingCardData;
}

/** One search result: the cover photo, rent, facts and where. The title is a stretched link. */
export function ListingCard({ listing }: ListingCardProps) {
  const { t, i18n } = useTranslation('listing');
  const where = [listing.neighborhood, `${listing.city.name}, ${listing.city.state}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card variant="outlined" component="article" className="relative flex h-full flex-col">
      {/* Reserved space: the grid never shifts while photos arrive. The heart sits above the
          stretched link (z-10), so it is its own control. */}
      <SaveButton
        listingId={listing.id}
        saved={listing.saved}
        title={listing.title}
        className="absolute top-2 right-2 z-10"
      />
      <div className="aspect-[4/3] w-full overflow-hidden bg-badge-neutral-background">
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
      <div className="flex flex-1 flex-col gap-1 p-4">
        <Typography variant="h6" component="p" className="app-tabular">
          {t('card.perMonth', { rent: formatRent(listing.rent, i18n.language) })}
        </Typography>
        <Typography variant="subtitle2" component="h2" className="truncate">
          <Link
            to={listingPath(listing.id)}
            aria-label={t('card.open', { title: listing.title })}
            // Stretched link: the whole card opens the home; the name stays the one <a>.
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
        <Typography
          variant="caption"
          component="span"
          className="font-medium mt-auto self-start rounded-full bg-badge-active-background px-2.5 py-1 text-badge-active-text"
        >
          {t('card.availableFrom', { date: formatDay(listing.availableFrom, i18n.language) })}
        </Typography>
      </div>
    </Card>
  );
}
