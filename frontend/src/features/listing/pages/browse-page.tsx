import Pagination from '@mui/material/Pagination';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { SaveSearchButton } from '@/features/saved-search';
import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { filtersOf, hasFilters } from '@/shared/lib/listing-search';

import { BrowseResults } from '../components/browse-results';
import { FilterBar } from '../components/filter-bar';
import { RecentlyViewed } from '../components/recently-viewed';
import { useBrowseParams } from '../hooks/use-browse-params';
import { useListings } from '../hooks/use-listing-queries';

/**
 * Published homes: every filter, the sort and the page in the URL, so a search can be shared. On a
 * phone the page numbers drop their siblings, so the row fits with 44 px targets (RESP-5).
 */
export function BrowsePage(): ReactElement {
    const { t } = useTranslation('listing');
    const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
    const { params, update, clear } = useBrowseParams();
    const forSale = params.kind === 'sale';
    useDocumentTitle(forSale ? t('browse.pageTitleSale') : t('browse.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    const listings = useListings(params);
    const total = listings.data?.totalElements ?? 0;
    const pages = Math.ceil(total / params.size);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <Typography ref={headingRef} tabIndex={-1} variant="h4" component="h1" className="outline-none">
                    {forSale ? t('browse.titleSale') : t('browse.title')}
                </Typography>
                <Typography variant="body2" color="textSecondary" className="hidden sm:block">
                    {t('browse.subtitle')}
                </Typography>
            </div>
            <FilterBar
                params={params}
                total={listings.data?.totalElements}
                onChange={update}
                onClear={clear}
                saveSearch={<SaveSearchButton filters={filtersOf(params)} />}
            />
            {params.page === 1 && !hasFilters(filtersOf(params)) && (
                <>
                    <RecentlyViewed />
                    <Typography variant="h6" component="h2" className="-mb-2">
                        {forSale ? t('browse.allHomesSale') : t('browse.allHomes')}
                    </Typography>
                </>
            )}
            <section aria-label={t('browse.results')} aria-busy={listings.isFetching}>
                <BrowseResults listings={listings} onClear={clear} />
            </section>
            {pages > 1 && (
                <Pagination
                    siblingCount={isPhone ? 0 : 1}
                    boundaryCount={1}
                    shape="rounded"
                    color="primary"
                    count={pages}
                    page={Math.min(params.page, pages)}
                    aria-label={t('browse.pages')}
                    onChange={(_event, value) => {
                        update({ page: value });
                    }}
                    className="self-center [&_ul]:justify-center"
                />
            )}
        </div>
    );
}
