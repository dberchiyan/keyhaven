import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { managedListingPath, PATHS } from '@/shared/lib/paths';
import { DetailPageFrame } from '../components/DetailPageFrame';
import { ListingForm } from '../components/ListingForm';
import { ListingError } from '../components/ListingStates';
import { useManagedListing } from '../hooks/useListingQueries';

/** `/manage/new` creates; `/manage/:listingId/edit` edits the details. */
export default function ListingEditorPage() {
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
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
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
        <ListingError
          error={listing.error}
          retryLabel={t('managed.retry')}
          onRetry={() => void listing.refetch()}
        />
      </DetailPageFrame>
    );
  }
  return (
    <DetailPageFrame headingRef={headingRef} title={title} back={back}>
      <Card variant="outlined" className="max-w-3xl">
        <CardContent className="p-4 sm:p-6">
          {/* Keyed by the listing's version: a fresh form after someone else's save. */}
          <ListingForm
            key={isEditing ? `${listingId}-${String(listing.data?.version ?? 0)}` : 'new'}
            listing={isEditing ? (listing.data ?? null) : null}
            cancelTo={back.to}
          />
        </CardContent>
      </Card>
    </DetailPageFrame>
  );
}
