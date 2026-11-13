import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { PATHS } from '@/shared/lib/paths';
import { DetailPageFrame } from '../components/DetailPageFrame';
import { ListingDetailView } from '../components/ListingDetailView';
import { ListingError } from '../components/ListingStates';
import { SaveButton } from '../components/SaveButton';
import { useListing } from '../hooks/useListingQueries';

/** One published home as a tenant sees it (owners and admins see the address too). */
export default function ListingPage() {
  const { t } = useTranslation('listing');
  const { listingId = '' } = useParams();
  const listing = useListing(listingId);
  const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
  useDocumentTitle(
    listing.data ? t('detail.pageTitle', { title: listing.data.title }) : t('browse.pageTitle'),
  );

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
  return (
    <DetailPageFrame headingRef={headingRef} title={listing.data.title} back={back}>
      <ListingDetailView
        listing={listing.data}
        aside={
          <Card variant="outlined">
            <CardContent className="flex flex-col gap-2 p-4">
              {/* M2 brings viewing slots; until then the button says so instead of hiding. */}
              <div className="flex items-center gap-2">
                <Button
                  variant="contained"
                  size="large"
                  disabled
                  startIcon={<CalendarMonthOutlined aria-hidden />}
                  className="flex-1"
                >
                  {`${t('detail.book')} — ${t('detail.bookSoon')}`}
                </Button>
                <SaveButton
                  listingId={listing.data.id}
                  saved={listing.data.saved}
                  title={listing.data.title}
                  className="border border-divider"
                />
              </div>
              <Typography variant="caption" color="textSecondary">
                {t('detail.bookHint')}
              </Typography>
            </CardContent>
          </Card>
        }
      />
    </DetailPageFrame>
  );
}
