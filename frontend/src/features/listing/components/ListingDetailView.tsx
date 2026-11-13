import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ListingDetail } from '../types';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { ListedByCard } from './ListedByCard';
import { ListingAmenities } from './ListingAmenities';
import { ListingDetails } from './ListingDetails';
import { ListingLocation } from './ListingLocation';
import { ListingSummaryCard } from './ListingSummaryCard';
import { PhotoGallery } from './PhotoGallery';

export interface ListingDetailViewProps {
  listing: ListingDetail;
  /** Beside the price: a status badge (the owner's view). */
  badge?: ReactNode;
  /** Inside the summary card, under the facts: contact, book, save (the tenant's view). */
  summaryActions?: ReactNode;
  /** A card after the summary: the owner's actions. */
  aside?: ReactNode;
  addressNote?: string;
}

/** Gallery and the blocks (details, amenities, about, location) on the left; contact and actions on the right. */
export function ListingDetailView({
  listing,
  badge,
  summaryActions,
  aside,
  addressNote,
}: ListingDetailViewProps) {
  const { t } = useTranslation('listing');
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">
        <PhotoGallery title={listing.title} photos={listing.photos} />
        {/* The page reads as blocks: a heading, a note, a card of rows — one per subject. */}
        <ListingDetails listing={listing} />
        <ListingAmenities listing={listing} />
        <section aria-labelledby="about-heading" className="flex flex-col gap-3">
          <Typography id="about-heading" variant="h6" component="h2">
            {t('detail.about')}
          </Typography>
          <Card variant="outlined">
            <CardContent className="p-4">
              {/* The card already bounds the line length (the page's two-column grid), so the text
                  runs to its edges instead of stopping at the prose measure. */}
              <Typography variant="body1" className="whitespace-pre-line">
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
      {/* The side column: the summary, the actions and "Listed by" together. First on a phone (as
          on the example); on a wide screen it follows the reader down the page, resting under the
          sticky top bar (the arbitrary top: the bar's height plus the page's own gap). */}
      <div className="order-first flex flex-col gap-4 lg:sticky lg:top-[calc(var(--spacing-top-bar-height)+1.5rem)] lg:order-none lg:self-start">
        {badge && <div className="flex">{badge}</div>}
        <ListingSummaryCard
          listing={listing}
          {...(summaryActions === undefined ? {} : { actions: summaryActions })}
        />
        {aside}
        <ListedByCard listedBy={listing.listedBy} />
      </div>
    </div>
  );
}
