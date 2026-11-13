import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { cn } from '@/shared/lib/cn';
import { BrowseToolbar } from '../components/BrowseToolbar';
import { ListingCard } from '../components/ListingCard';
import { ListingEmpty, ListingError, ListingGridLoading } from '../components/ListingStates';
import { useBrowseParams } from '../hooks/useBrowseParams';
import { useListings } from '../hooks/useListingQueries';

/** Published homes: a city filter, a sort and a paged grid — all kept in the URL. */
export default function BrowsePage() {
  const { t } = useTranslation('listing');
  useDocumentTitle(t('browse.pageTitle'));
  const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
  const { params, update } = useBrowseParams();
  const listings = useListings(params);
  const total = listings.data?.totalElements ?? 0;
  const pages = Math.ceil(total / params.size);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography
          ref={headingRef}
          tabIndex={-1}
          variant="h4"
          component="h1"
          className="outline-none"
        >
          {t('browse.title')}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t('browse.subtitle')}
        </Typography>
      </div>
      <BrowseToolbar params={params} total={listings.data?.totalElements} onChange={update} />
      <section aria-label={t('browse.results')} aria-busy={listings.isFetching}>
        {listings.isPending ? (
          <ListingGridLoading />
        ) : listings.isError ? (
          <ListingError
            error={listings.error}
            retryLabel={t('browse.retry')}
            onRetry={() => void listings.refetch()}
          />
        ) : listings.data.content.length === 0 ? (
          <ListingEmpty
            title={t('browse.empty')}
            hint={t('browse.emptyHint')}
            action={{
              label: t('browse.clear'),
              onClick: () => {
                update({ city: undefined });
              },
            }}
          />
        ) : (
          <ul
            className={cn(
              'm-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
              listings.isPlaceholderData && 'opacity-60',
            )}
          >
            {listings.data.content.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {pages > 1 && (
        <Pagination
          shape="rounded"
          color="primary"
          count={pages}
          page={Math.min(params.page, pages)}
          aria-label={t('browse.pages')}
          onChange={(_event, value) => {
            update({ page: value });
          }}
          className="self-center"
        />
      )}
    </div>
  );
}
