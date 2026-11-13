import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslation } from 'react-i18next';
import { useAccess, useCurrentUser } from '@/features/auth';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { useManagedListings } from '../hooks/useListingQueries';
import { MANAGED_PAGE_SIZES, useManagedListingsParams } from '../hooks/useManagedListingsParams';
import { ListingEmpty, ListingError, ListingGridLoading } from './ListingStates';
import { ManagedListingCards } from './ManagedListingCards';
import { ManagedListingTable } from './ManagedListingTable';
import { ManagedToolbar } from './ManagedToolbar';
import { StatusCounts } from './StatusCounts';

/** The owner's home: counts per status, filters in the URL, the list as a table or cards. */
export function ManagedListingsDashboard() {
  const { t } = useTranslation('listing');
  useDocumentTitle(t('manage.pageTitle'));
  const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
  const user = useCurrentUser().data;
  const can = useAccess();
  const theme = useTheme();
  // Behaviour CSS cannot express: which markup (table or cards) is rendered.
  const isTable = useMediaQuery(theme.breakpoints.up('md'));
  const { params, update } = useManagedListingsParams();
  const listings = useManagedListings(params);

  const scope = can('listing.suspend') ? 'all' : user?.agency ? 'agency' : 'own';
  const title =
    scope === 'all'
      ? t('manage.titleAll')
      : scope === 'agency'
        ? t('manage.titleAgency', { agency: user?.agency?.name ?? '' })
        : t('manage.titleOwn');
  const total = listings.data?.totalElements ?? 0;

  const content = () => {
    if (listings.isPending) {
      return <ListingGridLoading />;
    }
    if (listings.isError) {
      return (
        <ListingError
          error={listings.error}
          retryLabel={t('manage.retry')}
          onRetry={() => void listings.refetch()}
        />
      );
    }
    if (listings.data.content.length === 0) {
      return (
        <ListingEmpty
          title={t('manage.empty')}
          hint={t('manage.emptyHint')}
          action={{
            label: t('manage.clear'),
            onClick: () => {
              update({ status: undefined, search: '' });
            },
          }}
        />
      );
    }
    return isTable ? (
      <ManagedListingTable listings={listings.data.content} />
    ) : (
      <ManagedListingCards listings={listings.data.content} />
    );
  };

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
          {title}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t(`manage.scope.${scope}`, { agency: user?.agency?.name ?? '' })}
        </Typography>
      </div>
      <StatusCounts />
      <Card variant="outlined" aria-busy={listings.isFetching} className="overflow-hidden">
        <ManagedToolbar params={params} total={listings.data?.totalElements} onChange={update} />
        {listings.isFetching && listings.isPlaceholderData && (
          <LinearProgress aria-hidden className="h-0.5" />
        )}
        {content()}
        {total > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={Math.max(0, Math.min(params.page, Math.ceil(total / params.size)) - 1)}
            rowsPerPage={params.size}
            rowsPerPageOptions={[...MANAGED_PAGE_SIZES]}
            labelRowsPerPage={t('manage.pagination.rowsPerPage')}
            labelDisplayedRows={({ from, to, count }) =>
              t('manage.pagination.displayed', { from, to, count })
            }
            onPageChange={(_event, page) => {
              update({ page: page + 1 });
            }}
            onRowsPerPageChange={(event) => {
              update({ size: Number(event.target.value) });
            }}
          />
        )}
      </Card>
    </div>
  );
}
