import Pagination from '@mui/material/Pagination';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { SaveSearchButton } from '@/features/saved-search';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { cn } from '@/shared/lib/cn';
import { filtersOf, hasFilters } from '@/shared/lib/listingSearch';
import { FilterBar } from '../components/FilterBar';
import { ListingCard } from '../components/ListingCard';
import { ListingEmpty, ListingError, ListingGridLoading } from '../components/ListingStates';
import { RecentlyViewed } from '../components/RecentlyViewed';
import { useBrowseParams } from '../hooks/useBrowseParams';
import { useListings } from '../hooks/useListingQueries';

/** Published homes: every filter, the sort and the page in the URL, so a search can be shared. */
export default function BrowsePage() {
    const { t } = useTranslation('listing');
    // On a phone the page numbers must fit one row with 44 px touch targets: 1 … n only.
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
                    {/* A plain heading after the side note, so the page's main grid reads as its own part. */}
                    <Typography variant="h6" component="h2" className="-mb-2">
                        {forSale ? t('browse.allHomesSale') : t('browse.allHomes')}
                    </Typography>
                </>
            )}
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
                        action={{ label: t('filters.clear'), onClick: clear }}
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
