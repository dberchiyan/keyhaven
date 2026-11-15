import AddOutlined from '@mui/icons-material/AddOutlined';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate } from 'react-router';
import { useAccess, useCurrentUser } from '@/features/auth';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { PATHS } from '@/shared/lib/paths';
import { useManagedListingCounts, useManagedListings } from '../hooks/useListingQueries';
import {
  LISTING_STATUSES,
  MANAGED_PAGE_SIZES,
  useManagedListingsParams,
} from '../hooks/useManagedListingsParams';
import { AttentionStrip } from './AttentionStrip';
import { InsightsPanel } from './InsightsPanel';
import { ListingEmpty, ListingError, ListingGridLoading } from './ListingStates';
import { ManagedListingCards } from './ManagedListingCards';
import { ManagedListingTable } from './ManagedListingTable';
import { ManagedToolbar } from './ManagedToolbar';
import { ShowcaseNotice } from './ShowcaseNotice';

/**
 * The owner's home: the figures in the subtitle, what waits for them, then the listings — the
 * page's subject — as tabs by status with the counts, search, sort and the list; the interest
 * block comes after it (a second look, not the first).
 */
export function ManagedListingsDashboard() {
  const { t, i18n } = useTranslation('listing');
  useDocumentTitle(t('manage.pageTitle'));
  const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
  const navigate = useNavigate();
  const user = useCurrentUser().data;
  const can = useAccess();
  const theme = useTheme();
  // Behaviour CSS cannot express: which markup (table or cards) is rendered.
  const isTable = useMediaQuery(theme.breakpoints.up('md'));
  const { params, update } = useManagedListingsParams();
  const listings = useManagedListings(params);
  const counts = useManagedListingCounts();

  const scope = can('listing.suspend') ? 'all' : user?.agency ? 'agency' : 'own';
  const title =
    scope === 'all'
      ? t('manage.titleAll')
      : scope === 'agency'
        ? t('manage.titleAgency', { agency: user?.agency?.name ?? '' })
        : t('manage.titleOwn');
  const total = listings.data?.totalElements ?? 0;
  const format = new Intl.NumberFormat(i18n.language);
  const everything = counts.data
    ? LISTING_STATUSES.reduce((sum, status) => sum + counts.data[status], 0)
    : undefined;
  // "12 listings · 6 published · 2 drafts · 4 unpublished": only the statuses that have rows.
  const summary =
    counts.data && everything !== undefined
      ? [
          t('manage.summary.total', { count: everything, formatted: format.format(everything) }),
          ...LISTING_STATUSES.filter((status) => counts.data[status] > 0).map((status) =>
            t(`manage.summary.${status}`, { formatted: format.format(counts.data[status]) }),
          ),
        ].join(' · ')
      : t(`manage.scope.${scope}`, { agency: user?.agency?.name ?? '' });
  const unfiltered = params.status === undefined && params.search === '';

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
      // No listing at all (not a filter): the first one is the thing to do.
      return unfiltered && can('listing.create') ? (
        <ListingEmpty
          title={t('manage.first')}
          hint={t('manage.firstHint')}
          action={{ label: t('manage.new'), onClick: () => void navigate(PATHS.newListing) }}
        />
      ) : (
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
          <Typography variant="body2" color="textSecondary" className="app-tabular">
            {summary}
          </Typography>
        </div>
        {can('listing.create') && (
          <Button
            component={RouterLink}
            to={PATHS.newListing}
            variant="contained"
            startIcon={<AddOutlined aria-hidden />}
            className="shrink-0 self-start"
          >
            {t('manage.new')}
          </Button>
        )}
      </div>
      {user?.demoMode && <ShowcaseNotice scope="dashboard" />}
      <AttentionStrip />
      <Card
        variant="outlined"
        component="section"
        aria-labelledby="listings-heading"
        aria-busy={listings.isFetching}
        className="overflow-hidden"
      >
        <h2 id="listings-heading" className="sr-only">
          {t('manage.table.caption')}
        </h2>
        <ManagedToolbar
          params={params}
          total={listings.data?.totalElements}
          counts={counts.data}
          onChange={update}
        />
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
            className="border-t border-divider"
          />
        )}
      </Card>
      <InsightsPanel />
    </div>
  );
}
