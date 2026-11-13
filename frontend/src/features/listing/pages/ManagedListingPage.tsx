import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { PATHS } from '@/shared/lib/paths';
import { DetailPageFrame } from '../components/DetailPageFrame';
import { ListingActions } from '../components/ListingActions';
import { ListingDetailView } from '../components/ListingDetailView';
import { ListingStatusBadge } from '../components/ListingStatusBadge';
import { ListingError } from '../components/ListingStates';
import { formatInstant } from '../format';
import { useManagedListing } from '../hooks/useListingQueries';

/** One listing in the dashboard: everything the tenant sees, plus the address, status and actions. */
export default function ManagedListingPage() {
  const { t, i18n } = useTranslation('listing');
  const { listingId = '' } = useParams();
  const listing = useManagedListing(listingId);
  const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
  useDocumentTitle(
    listing.data ? t('managed.pageTitle', { title: listing.data.title }) : t('manage.pageTitle'),
  );

  const back = { to: PATHS.home, label: t('managed.back') };
  if (listing.isPending) {
    return (
      <DetailPageFrame headingRef={headingRef} title={t('manage.pageTitle')} back={back}>
        <div role="status" aria-busy="true" className="flex flex-col gap-4">
          <span className="sr-only">{t('manage.table.caption')}</span>
          <Skeleton variant="rounded" className="aspect-[3/2] h-auto w-full lg:w-2/3" />
          <Skeleton variant="text" className="w-1/3" />
        </div>
      </DetailPageFrame>
    );
  }
  if (listing.isError) {
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
    <DetailPageFrame headingRef={headingRef} title={listing.data.title} back={back}>
      <Typography variant="caption" color="textSecondary" className="-mt-2">
        {t('managed.updated', { date: formatInstant(listing.data.updatedAt, i18n.language) })}
      </Typography>
      <ListingDetailView
        listing={listing.data}
        badge={<ListingStatusBadge status={listing.data.status} />}
        aside={<ListingActions listing={listing.data} />}
        addressNote={t('managed.addressNote')}
      />
    </DetailPageFrame>
  );
}
