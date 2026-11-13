import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '../format';
import type { ListingDetail } from '../types';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { ListedByCard } from './ListedByCard';
import { ListingAmenities } from './ListingAmenities';
import { ListingDetails } from './ListingDetails';
import { ListingLocation } from './ListingLocation';
import { PhotoGallery } from './PhotoGallery';

export interface ListingDetailViewProps {
  listing: ListingDetail;
  /** Under the title: a status badge (the owner's view). */
  badge?: ReactNode;
  /** The side column's first card: actions (the owner's view) or the viewing call to action. */
  aside: ReactNode;
  addressNote?: string;
}

/** Gallery and the blocks (details, amenities, about, location) on the left; contact and actions on the right. */
export function ListingDetailView({ listing, badge, aside, addressNote }: ListingDetailViewProps) {
  const { t, i18n } = useTranslation('listing');
  const where = [listing.neighborhood, `${listing.city.name}, ${listing.city.state}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">
        <PhotoGallery title={listing.title} photos={listing.photos} />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Typography variant="h5" component="p" className="app-tabular">
              {formatPrice(listing, i18n.language, t)}
            </Typography>
            {badge}
          </div>
          <Typography variant="body1" color="textSecondary">
            {where}
          </Typography>
        </div>
        {/* The page reads as blocks: a heading, a note, a card of rows — one per subject. */}
        <ListingDetails listing={listing} />
        <ListingAmenities listing={listing} />
        <section aria-labelledby="about-heading" className="flex flex-col gap-3">
          <Typography id="about-heading" variant="h6" component="h2">
            {t('detail.about')}
          </Typography>
          <Card variant="outlined">
            <CardContent className="p-4">
              <Typography
                variant="body1"
                className="max-w-[var(--app-measure)] whitespace-pre-line"
              >
                {listing.description}
              </Typography>
            </CardContent>
          </Card>
        </section>
        <ListingLocation
          listing={listing}
          {...(addressNote === undefined ? {} : { note: addressNote })}
        />
      </div>
      <div className="flex flex-col gap-4 lg:sticky lg:top-top-bar-height lg:self-start">
        {aside}
        <ListedByCard listedBy={listing.listedBy} />
      </div>
    </div>
  );
}
