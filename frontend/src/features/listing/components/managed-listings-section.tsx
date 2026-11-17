import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useManagedListingCounts, useManagedListings } from '../hooks/use-listing-queries';
import { MANAGED_PAGE_SIZES, useManagedListingsParams } from '../hooks/use-managed-listings-params';
import { ManagedListingsBody } from './managed-listings-body';
import { ManagedToolbar } from './managed-toolbar';

/**
 * The listings — the dashboard's subject — with status tabs, search, sort and paging, all in the
 * URL. A page change keeps the previous rows under a thin progress bar instead of a skeleton (QRY-5).
 */
export function ManagedListingsSection(): ReactElement {
    const { t } = useTranslation('listing');
    const { params, update } = useManagedListingsParams();
    const listings = useManagedListings(params);
    const counts = useManagedListingCounts();
    const total = listings.data?.totalElements ?? 0;
    return (
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
            {listings.isFetching && listings.isPlaceholderData && <LinearProgress aria-hidden className="h-0.5" />}
            <ManagedListingsBody
                listings={listings}
                isUnfiltered={params.status === undefined && params.search === ''}
                onClearFilters={() => {
                    update({ status: undefined, search: '' });
                }}
            />
            {total > 0 && (
                <TablePagination
                    component="div"
                    count={total}
                    page={Math.max(0, Math.min(params.page, Math.ceil(total / params.size)) - 1)}
                    rowsPerPage={params.size}
                    rowsPerPageOptions={[...MANAGED_PAGE_SIZES]}
                    labelRowsPerPage={t('manage.pagination.rowsPerPage')}
                    labelDisplayedRows={({ from, to, count }) => t('manage.pagination.displayed', { from, to, count })}
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
    );
}
