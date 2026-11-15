import EditOutlined from '@mui/icons-material/EditOutlined';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useParams } from 'react-router';
import { useAccess } from '@/features/auth';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { editListingPath, PATHS } from '@/shared/lib/paths';
import { DetailPageFrame } from '../components/DetailPageFrame';
import { ListingActions } from '../components/ListingActions';
import { ListingDetailView } from '../components/ListingDetailView';
import { ListingStatusBadge } from '../components/ListingStatusBadge';
import { ListingError } from '../components/ListingStates';
import { ListingInsightsSection } from '../components/ListingInsightsSection';
import { PhotoManager } from '../components/PhotoManager';
import { ShowcaseBadge } from '../components/ShowcaseBadge';
import { ShowcaseNotice } from '../components/ShowcaseNotice';
import { formatInstant } from '../format';
import { useManagedListing } from '../hooks/useListingQueries';

/** One listing in the dashboard: everything the tenant sees, plus the address, status and actions. */
export default function ManagedListingPage() {
  const { t, i18n } = useTranslation('listing');
  const { listingId = '' } = useParams();
  const listing = useManagedListing(listingId);
  const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
  const can = useAccess();
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
      <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Typography variant="caption" color="textSecondary">
          {t('managed.updated', { date: formatInstant(listing.data.updatedAt, i18n.language) })}
        </Typography>
        <Typography variant="caption" color="textSecondary" className="app-tabular">
          {t('managed.counts', { views: listing.data.viewCount, saves: listing.data.saveCount })}
        </Typography>
      </div>
      {listing.data.demo && <ShowcaseNotice scope="listing" />}
      {can('listing.edit') && listing.data.status !== 'SUSPENDED' && (
        <Card variant="outlined">
          <CardContent className="flex flex-col gap-4 p-4">
            <PhotoManager listing={listing.data} readOnly={listing.data.demo} />
            {/* Disabled, not hidden, on a showcase listing: the notice above says why. */}
            <Button
              component={RouterLink}
              to={editListingPath(listing.data.id)}
              variant="outlined"
              startIcon={<EditOutlined aria-hidden />}
              disabled={listing.data.demo}
              className="self-start"
            >
              {t('managed.edit')}
            </Button>
          </CardContent>
        </Card>
      )}
      <ListingInsightsSection listingId={listing.data.id} />
      <ListingDetailView
        listing={listing.data}
        badge={
          <span className="inline-flex flex-wrap gap-1">
            <ListingStatusBadge status={listing.data.status} />
            {listing.data.demo && <ShowcaseBadge />}
          </span>
        }
        aside={<ListingActions listing={listing.data} />}
        addressNote={t('managed.addressNote')}
      />
    </DetailPageFrame>
  );
}
