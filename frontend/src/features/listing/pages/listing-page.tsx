import Skeleton from '@mui/material/Skeleton';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { BookViewingSection } from '@/features/viewing';
import { ErrorState } from '@/shared/components/error-state';
import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { PATHS } from '@/shared/lib/paths';

import { DetailPageFrame } from '../components/detail-page-frame';
import { ListingActionBar } from '../components/listing-action-bar';
import { ListingContactActions } from '../components/listing-contact-actions';
import { ListingDetailView } from '../components/listing-detail-view';
import { SimilarHomes } from '../components/similar-homes';
import { listingKeys } from '../hooks/query-keys';
import { useListing } from '../hooks/use-listing-queries';
import { useRememberViewed } from '../hooks/use-recently-viewed-ids';

const BOOK_HREF = '#book-viewing';

/**
 * One published home as a tenant sees it (owners and admins see the address too). The visit is
 * remembered in this browser for "recently viewed"; a booking re-reads the home, because a
 * confirmed viewing reveals its address.
 */
export function ListingPage(): ReactElement {
    const { t } = useTranslation('listing');
    const { listingId = '' } = useParams();
    const listing = useListing(listingId);
    const queryClient = useQueryClient();
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    useRememberViewed(listing.data?.id);
    useDocumentTitle(listing.data ? t('detail.pageTitle', { title: listing.data.title }) : t('browse.pageTitle'));

    const back = { to: PATHS.browse, label: t('detail.back') };
    if (listing.isPending) {
        return (
            <DetailPageFrame headingRef={headingRef} title={t('browse.title')} back={back}>
                <div role="status" aria-busy="true" className="flex flex-col gap-4">
                    <span className="sr-only">{t('browse.results')}</span>
                    <Skeleton variant="rounded" className="aspect-3/2 h-auto w-full lg:w-2/3" />
                    <Skeleton variant="text" className="w-1/3" />
                    <Skeleton variant="text" className="w-1/2" />
                </div>
            </DetailPageFrame>
        );
    }
    if (listing.isError) {
        return (
            <DetailPageFrame headingRef={headingRef} title={t('detail.error')} back={back}>
                <ErrorState error={listing.error} onRetry={() => void listing.refetch()} />
            </DetailPageFrame>
        );
    }
    const contactHref = `mailto:${listing.data.listedBy.email}?subject=${encodeURIComponent(t('detail.contactSubject', { title: listing.data.title }))}`;
    return (
        <DetailPageFrame headingRef={headingRef} title={listing.data.title} back={back}>
            <ListingDetailView
                listing={listing.data}
                summaryActions={
                    <ListingContactActions listing={listing.data} contactHref={contactHref} bookHref={BOOK_HREF} />
                }
            />
            <BookViewingSection
                listing={listing.data}
                onChanged={() => {
                    void queryClient.invalidateQueries({ queryKey: listingKeys.detail(listing.data.id) });
                }}
            />
            <SimilarHomes listing={listing.data} />
            <ListingActionBar listing={listing.data} contactHref={contactHref} bookHref={BOOK_HREF} />
        </DetailPageFrame>
    );
}
