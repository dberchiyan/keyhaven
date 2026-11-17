import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess, useCurrentUser } from '@/features/auth';
import type { Schemas } from '@/shared/types';

import { isUpcoming, zoneName } from '../format';
import { useBookViewing } from '../hooks/use-book-viewing';
import { useOwnViewings, useViewingSlots } from '../hooks/use-viewing-queries';
import { BookedViewing } from './booked-viewing';
import { BookingForm } from './booking-form';
import { BookingSignIn } from './booking-sign-in';
import { SlotPicker } from './slot-picker';

export interface BookViewingSectionProps {
    listing: Pick<Schemas['ListingDetailResponse_Output'], 'id' | 'title' | 'city' | 'listedBy'>;
    onChanged?: () => void;
}

/**
 * "Book a viewing" on a listing page: the open slots; a tenant picks one and asks, a visitor is
 * sent to sign in, a tenant with a live viewing of this home sees it instead; closed hours say
 * so. The first week of slots is the picker's own query (same key), read here only to know
 * whether the home has hours. "Now" is taken once per mount so the live viewing does not flip
 * while the page is open; after a request or a cancellation the page re-reads the home, whose
 * address may now show.
 */
export function BookViewingSection({ listing, onChanged }: BookViewingSectionProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const { data: user } = useCurrentUser();
    const can = useAccess();
    const isTenant = Boolean(user) && can('viewing.book');
    const own = useOwnViewings(isTenant);
    const isOpen = useViewingSlots(listing.id, undefined).data?.isOpen;
    const [justBooked, setJustBooked] = useState(false);
    const [now] = useState(() => Date.now());
    const booking = useBookViewing(listing.id, () => {
        setJustBooked(true);
        onChanged?.();
    });
    const active = own.data?.find((viewing) => viewing.listing.id === listing.id && isUpcoming(viewing, now));
    const lister = listing.listedBy.kind === 'AGENCY' ? listing.listedBy.name : t('book.theLandlord');
    const offersSlots = isOpen !== false;

    return (
        <Card
            variant="outlined"
            component="section"
            id="book-viewing"
            aria-labelledby="book-viewing-heading"
            className="scroll-mt-24"
        >
            <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-col gap-0.5">
                    <Typography id="book-viewing-heading" variant="h6" component="h2">
                        {t('book.title')}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {offersSlots
                            ? t('book.hint', { zone: zoneName(listing.city.timeZone, i18n.language, 'long') })
                            : t('book.closed', { lister })}
                    </Typography>
                </div>
                {active ? (
                    <BookedViewing
                        viewing={active}
                        justBooked={justBooked}
                        onChanged={() => {
                            setJustBooked(false);
                            onChanged?.();
                        }}
                    />
                ) : (
                    <SlotPicker
                        listingId={listing.id}
                        selected={booking.slot}
                        onSelect={booking.setSlot}
                        disabled={booking.isPending || (Boolean(user) && !isTenant)}
                    >
                        {offersSlots && user && !isTenant && (
                            <Typography variant="body2" color="textSecondary">
                                {t('book.notATenant')}
                            </Typography>
                        )}
                        {offersSlots && isTenant && (
                            <BookingForm booking={booking} isVerified={user?.emailVerifiedAt !== null} />
                        )}
                        {offersSlots && !user && <BookingSignIn />}
                    </SlotPicker>
                )}
            </CardContent>
        </Card>
    );
}
