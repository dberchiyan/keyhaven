import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { ListingDetail } from '../types';
import { ListedByCard } from './listed-by-card';
import { ListingAmenities } from './listing-amenities';
import { ListingDetails } from './listing-details';
import { ListingLocation } from './listing-location';
import { ListingSummaryCard } from './listing-summary-card';
import { PhotoGallery } from './photo-gallery';

export interface ListingDetailViewProps {
    listing: ListingDetail;
    statusBadge?: ReactNode;
    summaryActions?: ReactNode;
    ownerActions?: ReactNode;
    addressNote?: string;
}

/**
 * Gallery and the blocks (details, amenities, about, location — each a heading and a card) on the
 * left; the summary, the owner's actions and "Listed by" on the right. Three grid items, so a
 * phone reads photos → summary → blocks while a wide screen keeps the side column, which follows
 * the reader down and rests under the sticky top bar. The description runs to the card's edges:
 * the two-column grid already bounds its measure.
 */
export function ListingDetailView({
    listing,
    statusBadge,
    summaryActions,
    ownerActions,
    addressNote,
}: ListingDetailViewProps): ReactElement {
    const { t } = useTranslation('listing');
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                <PhotoGallery title={listing.title} photos={listing.photos} />
            </div>
            <div className="order-3 flex min-w-0 flex-col gap-6 lg:order-none lg:col-start-1 lg:row-start-2">
                <ListingDetails listing={listing} />
                <ListingAmenities listing={listing} />
                <section aria-labelledby="about-heading" className="flex flex-col gap-3">
                    <Typography id="about-heading" variant="h6" component="h2">
                        {t('detail.about')}
                    </Typography>
                    <Card variant="outlined">
                        <CardContent className="p-4">
                            <Typography variant="body1" className="whitespace-pre-line">
                                {listing.description}
                            </Typography>
                        </CardContent>
                    </Card>
                </section>
                <ListingLocation listing={listing} {...(addressNote === undefined ? {} : { note: addressNote })} />
            </div>
            <div className="order-2 flex flex-col gap-4 lg:sticky lg:top-[calc(var(--spacing-top-bar-height)+1.5rem)] lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
                {statusBadge && <div className="flex">{statusBadge}</div>}
                <ListingSummaryCard
                    listing={listing}
                    {...(summaryActions === undefined ? {} : { actions: summaryActions })}
                />
                {ownerActions}
                <ListedByCard listedBy={listing.listedBy} />
            </div>
        </div>
    );
}
