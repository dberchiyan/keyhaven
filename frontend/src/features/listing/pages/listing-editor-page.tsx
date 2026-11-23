import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';

import { ErrorState } from '@/shared/components/error-state';
import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { managedListingPath, PATHS } from '@/shared/lib/paths';

import { DetailPageFrame } from '../components/detail-page-frame';
import { ListingForm } from '../components/listing-form';
import { useManagedListing } from '../hooks/use-managed-listing-queries';

/**
 * `/manage/new` creates; `/manage/:listingId/edit` edits the details. A showcase listing is
 * read-only in the demo, so its editor sends the reader back to the listing's page, which says
 * why. The form is keyed by the listing's version: someone else's save remounts it with fresh
 * values instead of resetting it in an effect (ARCH-33).
 */
export function ListingEditorPage(): ReactElement {
    const { t } = useTranslation('listing');
    const { listingId } = useParams();
    const isEditing = listingId !== undefined;
    useDocumentTitle(isEditing ? t('editor.editPageTitle') : t('editor.newPageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    const listing = useManagedListing(listingId ?? '');

    const title = isEditing ? t('editor.editTitle') : t('editor.newTitle');
    const back = isEditing
        ? { to: managedListingPath(listingId), label: t('managed.back') }
        : { to: PATHS.home, label: t('managed.back') };

    if (isEditing && listing.isPending) {
        return (
            <DetailPageFrame headingRef={headingRef} title={title} back={back}>
                <div role="status" aria-busy="true" className="flex flex-col gap-4">
                    <span className="sr-only">{t('manage.table.caption')}</span>
                    <Skeleton variant="rounded" height={56} />
                    <Skeleton variant="rounded" height={120} />
                </div>
            </DetailPageFrame>
        );
    }
    if (isEditing && listing.isError) {
        return (
            <DetailPageFrame headingRef={headingRef} title={t('managed.error')} back={back}>
                <ErrorState error={listing.error} onRetry={() => void listing.refetch()} />
            </DetailPageFrame>
        );
    }
    if (isEditing && listing.data?.isDemo) {
        return <Navigate to={managedListingPath(listingId)} replace />;
    }
    return (
        <DetailPageFrame headingRef={headingRef} title={title} back={back}>
            <Card variant="outlined" className="max-w-3xl">
                <CardContent className="p-4 sm:p-6">
                    <ListingForm
                        key={isEditing ? `${listingId}-${String(listing.data?.version ?? 0)}` : 'new'}
                        listing={isEditing ? listing.data : undefined}
                        cancelTo={back.to}
                    />
                </CardContent>
            </Card>
        </DetailPageFrame>
    );
}
