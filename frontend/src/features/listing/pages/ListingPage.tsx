import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { BookViewingSection } from '@/features/viewing';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { PATHS } from '@/shared/lib/paths';
import { DetailPageFrame } from '../components/DetailPageFrame';
import { ListingActionBar } from '../components/ListingActionBar';
import { ListingDetailView } from '../components/ListingDetailView';
import { ListingError } from '../components/ListingStates';
import { SimilarHomes } from '../components/SimilarHomes';
import { SaveButton } from '../components/SaveButton';
import { listingKeys } from '../hooks/queryKeys';
import { useListing } from '../hooks/useListingQueries';
import { rememberViewed } from '../lib/recentlyViewed';

/** One published home as a tenant sees it (owners and admins see the address too). */
export default function ListingPage() {
    const { t } = useTranslation('listing');
    const { listingId = '' } = useParams();
    const listing = useListing(listingId);
    const queryClient = useQueryClient();
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    // The browser's own "recently viewed" (a signed-in person's also comes from the server).
    useEffect(() => {
        if (listing.data) {
            rememberViewed(listing.data.id);
        }
    }, [listing.data]);
    useDocumentTitle(listing.data ? t('detail.pageTitle', { title: listing.data.title }) : t('browse.pageTitle'));

    const back = { to: PATHS.browse, label: t('detail.back') };
    if (listing.isPending) {
        return (
            <DetailPageFrame headingRef={headingRef} title={t('browse.title')} back={back}>
                <div role="status" aria-busy="true" className="flex flex-col gap-4">
                    <span className="sr-only">{t('browse.results')}</span>
                    <Skeleton variant="rounded" className="aspect-[3/2] h-auto w-full lg:w-2/3" />
                    <Skeleton variant="text" className="w-1/3" />
                    <Skeleton variant="text" className="w-1/2" />
                </div>
            </DetailPageFrame>
        );
    }
    if (listing.isError) {
        return (
            <DetailPageFrame headingRef={headingRef} title={t('detail.error')} back={back}>
                <ListingError
                    error={listing.error}
                    retryLabel={t('detail.retry')}
                    onRetry={() => void listing.refetch()}
                />
            </DetailPageFrame>
        );
    }
    const contactHref = `mailto:${listing.data.listedBy.email}?subject=${encodeURIComponent(t('detail.contactSubject', { title: listing.data.title }))}`;
    return (
        <DetailPageFrame headingRef={headingRef} title={listing.data.title} back={back}>
            <ListingDetailView
                listing={listing.data}
                summaryActions={
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Button
                                href={contactHref}
                                variant="contained"
                                size="large"
                                startIcon={<MailOutlined aria-hidden />}
                                className="flex-1"
                            >
                                {listing.data.listedBy.kind === 'AGENCY'
                                    ? t('detail.contactAgency', { name: listing.data.listedBy.name })
                                    : t('detail.contactLandlord')}
                            </Button>
                            <SaveButton
                                listingId={listing.data.id}
                                saved={listing.data.saved}
                                title={listing.data.title}
                                className="border border-divider"
                            />
                        </div>
                        {/* An in-page link: the booking block sits under the details. */}
                        <Button
                            href="#book-viewing"
                            variant="outlined"
                            size="large"
                            startIcon={<CalendarMonthOutlined aria-hidden />}
                        >
                            {t('detail.book')}
                        </Button>
                    </div>
                }
            />
            <BookViewingSection
                listing={listing.data}
                onChanged={() => {
                    // A confirmed viewing reveals the address: the home is read again.
                    void queryClient.invalidateQueries({ queryKey: listingKeys.detail(listing.data.id) });
                }}
            />
            <SimilarHomes listing={listing.data} />
            <ListingActionBar listing={listing.data} contactHref={contactHref} bookHref="#book-viewing" />
        </DetailPageFrame>
    );
}
