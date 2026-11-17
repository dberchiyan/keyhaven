import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation } from 'react-router';
import { type LoginLocationState, RESERVED_LINE, useAccess, useCurrentUser } from '@/features/auth';
import { PATHS, settingsPath } from '@/shared/lib/paths';
import type { Schemas } from '@/shared/types';
import { formatSlot, isUpcoming, zoneName } from '../format';
import { MESSAGE_MAX, useBookViewing } from '../hooks/useBookViewing';
import { useOwnViewings, useViewingSlots } from '../hooks/useViewingQueries';
import { SlotPicker } from './SlotPicker';
import { ViewingCard } from './ViewingCard';

export interface BookViewingSectionProps {
    listing: Pick<Schemas['ListingDetailResponse_Output'], 'id' | 'title' | 'city' | 'listedBy'>;
    /** After a request or a cancellation: the page re-reads the home (its address may change). */
    onChanged?: () => void;
}

/**
 * "Book a viewing" on a listing page: the open slots of the coming days; a tenant picks one and
 * asks (with a note); a visitor is sent to sign in and comes back here; a tenant who already has
 * a live viewing of this home sees it instead of the picker. Closed hours say so.
 */
export function BookViewingSection({ listing, onChanged }: BookViewingSectionProps) {
    const { t, i18n } = useTranslation(['viewing', 'errors']);
    const { data: user } = useCurrentUser();
    const can = useAccess();
    const location = useLocation();
    const isTenant = Boolean(user) && can('viewing.book');
    const own = useOwnViewings(isTenant);
    // The first week of slots is the picker's own query too (same key): one request, read here
    // only to know whether the home has hours at all.
    const firstWeek = useViewingSlots(listing.id, undefined);
    const open = firstWeek.data ? firstWeek.data.open : null;
    const [justBooked, setJustBooked] = useState(false);
    // "Now" once per mount: the active viewing does not flip while the page is open.
    const [now] = useState(() => Date.now());
    const { slot, setSlot, message, setMessage, submit, isPending, errorCode, slotMissing, errorRef } = useBookViewing(
        listing.id,
        () => {
            setJustBooked(true);
            onChanged?.();
        },
    );
    const active = own.data?.find((viewing) => viewing.listing.id === listing.id && isUpcoming(viewing, now));
    const zone = listing.city.timeZone;
    const loginState: LoginLocationState = {
        from: `${location.pathname}${location.search}#book-viewing`,
    };
    const verified = user?.emailVerifiedAt !== null;

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
                        {t('viewing:book.title')}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {open === false
                            ? t('viewing:book.closed', {
                                  lister:
                                      listing.listedBy.kind === 'AGENCY'
                                          ? listing.listedBy.name
                                          : t('viewing:book.theLandlord'),
                              })
                            : t('viewing:book.hint', { zone: zoneName(zone, i18n.language, 'long') })}
                    </Typography>
                </div>

                {active ? (
                    <div className="flex flex-col gap-3">
                        {justBooked && (
                            <Alert severity="success" role="status">
                                {t('viewing:book.requested', {
                                    when: formatSlot(active.startsAt, zone, i18n.language),
                                })}
                            </Alert>
                        )}
                        <ViewingCard
                            viewing={active}
                            audience="tenant"
                            hideListing
                            onChanged={() => {
                                setJustBooked(false);
                                onChanged?.();
                            }}
                        />
                        <Typography variant="caption" color="textSecondary">
                            {t('viewing:book.seeAll')}{' '}
                            <Link component={RouterLink} to={PATHS.viewings} underline="hover">
                                {t('viewing:book.seeAllLink')}
                            </Link>
                        </Typography>
                    </div>
                ) : (
                    <>
                        <SlotPicker
                            listingId={listing.id}
                            selected={slot}
                            onSelect={setSlot}
                            disabled={isPending || (Boolean(user) && !isTenant)}
                        >
                            {open !== false && user && !isTenant && (
                                <Typography variant="body2" color="textSecondary">
                                    {t('viewing:book.notATenant')}
                                </Typography>
                            )}
                            {open !== false && isTenant && (
                                <form
                                    noValidate
                                    className="flex flex-col gap-3"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void submit();
                                    }}
                                >
                                    <TextField
                                        label={t('viewing:book.message')}
                                        multiline
                                        minRows={2}
                                        fullWidth
                                        value={message}
                                        onChange={(event) => {
                                            setMessage(event.target.value);
                                        }}
                                        helperText={
                                            message.length > MESSAGE_MAX - 60
                                                ? t('viewing:book.messageLeft', {
                                                      count: MESSAGE_MAX - message.length,
                                                  })
                                                : t('viewing:book.messageHint')
                                        }
                                        slotProps={{ htmlInput: { maxLength: MESSAGE_MAX } }}
                                    />
                                    {/* The reserved line: a missing slot, a server answer, or nothing. */}
                                    <Typography
                                        ref={errorRef}
                                        tabIndex={-1}
                                        variant="body2"
                                        color="error"
                                        role={errorCode || slotMissing ? 'alert' : undefined}
                                        className="outline-none"
                                    >
                                        {slotMissing ? (
                                            t('viewing:book.pickFirst')
                                        ) : errorCode === 'EMAIL_NOT_VERIFIED' || !verified ? (
                                            <>
                                                {t('viewing:book.verifyFirst')}{' '}
                                                <Link component={RouterLink} to={settingsPath('account')}>
                                                    {t('viewing:book.verifyLink')}
                                                </Link>
                                            </>
                                        ) : errorCode ? (
                                            t(`errors:${errorCode}`)
                                        ) : (
                                            RESERVED_LINE
                                        )}
                                    </Typography>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        startIcon={<EventAvailableOutlined aria-hidden />}
                                        loading={isPending}
                                        disabled={!verified}
                                        className="self-start"
                                    >
                                        {slot ? t('viewing:book.submit') : t('viewing:book.submitPick')}
                                    </Button>
                                </form>
                            )}
                            {open !== false && !user && (
                                <div className="flex flex-col gap-2">
                                    <Button
                                        component={RouterLink}
                                        to={PATHS.login}
                                        state={loginState}
                                        variant="contained"
                                        size="large"
                                        startIcon={<EventAvailableOutlined aria-hidden />}
                                        className="self-start"
                                    >
                                        {t('viewing:book.signInToBook')}
                                    </Button>
                                    <Typography variant="caption" color="textSecondary">
                                        {t('viewing:book.signInHint')}{' '}
                                        <Link component={RouterLink} to={PATHS.signup} underline="hover">
                                            {t('viewing:book.signUpLink')}
                                        </Link>
                                    </Typography>
                                </div>
                            )}
                        </SlotPicker>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
