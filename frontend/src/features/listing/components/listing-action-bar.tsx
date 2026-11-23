import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { formatPrice } from '../format';
import type { ListingDetail } from '../types';
import { SaveButton } from './save-button';

export interface ListingActionBarProps {
    listing: ListingDetail;
    contactHref: string;
    bookHref?: string;
}

/**
 * The phone's bottom bar on a listing page: the price, the heart, contact and — when the page has
 * a booking block — booking as the main action; padded for the home indicator (RESP-5).
 */
export function ListingActionBar({ listing, contactHref, bookHref }: ListingActionBarProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    return (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-background-paper/90 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
            <div className="flex items-center gap-4">
                <div className="flex min-w-0 flex-col">
                    <Typography variant="subtitle1" component="p" className="app-tabular">
                        {formatPrice(listing, i18n.language, t)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" className="truncate">
                        {listing.neighborhood ?? listing.city.name}
                    </Typography>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <SaveButton
                        listingId={listing.id}
                        saved={listing.isSaved}
                        title={listing.title}
                        className="border border-divider"
                    />
                    {bookHref ? (
                        <>
                            <IconButton
                                href={contactHref}
                                aria-label={t('detail.contact')}
                                className="border border-divider"
                            >
                                <MailOutlined aria-hidden />
                            </IconButton>
                            <Button
                                href={bookHref}
                                variant="contained"
                                startIcon={<CalendarMonthOutlined aria-hidden />}
                            >
                                {t('detail.book')}
                            </Button>
                        </>
                    ) : (
                        <Button href={contactHref} variant="contained" startIcon={<MailOutlined aria-hidden />}>
                            {t('detail.contact')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
