import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import Button from '@mui/material/Button';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { ListingDetail } from '../types';
import { SaveButton } from './save-button';

export interface ListingContactActionsProps {
    listing: ListingDetail;
    contactHref: string;
    bookHref: string;
}

/**
 * Contact, save and book inside the summary card (the tenant's view). Booking is an in-page link:
 * the booking block sits under the details.
 */
export function ListingContactActions({ listing, contactHref, bookHref }: ListingContactActionsProps): ReactElement {
    const { t } = useTranslation('listing');
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Button
                    href={contactHref}
                    variant="contained"
                    size="large"
                    startIcon={<MailOutlined aria-hidden />}
                    className="flex-1"
                >
                    {listing.listedBy.kind === 'AGENCY'
                        ? t('detail.contactAgency', { name: listing.listedBy.name })
                        : t('detail.contactLandlord')}
                </Button>
                <SaveButton
                    listingId={listing.id}
                    saved={listing.isSaved}
                    title={listing.title}
                    className="border border-divider"
                />
            </div>
            <Button href={bookHref} variant="outlined" size="large" startIcon={<CalendarMonthOutlined aria-hidden />}>
                {t('detail.book')}
            </Button>
        </div>
    );
}
