import SearchOffOutlined from '@mui/icons-material/SearchOffOutlined';
import Pagination from '@mui/material/Pagination';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { cn } from '@/shared/lib/cn';
import { PATHS } from '@/shared/lib/paths';

import { useSavedListings } from '../hooks/use-listing-queries';
import { useSavedParams } from '../hooks/use-saved-params';
import { ListingCard } from './listing-card';
import { ListingGridLoading } from './listing-states';

/**
 * The tenant's saved homes still on the site, newest save first; the page is in the URL. On a
 * phone the page numbers must fit one row with 44 px targets, so only the ends show (RESP-5).
 */
export function SavedHomesSection(): ReactElement {
    const { t } = useTranslation('listing');
    const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
    const navigate = useNavigate();
    const { params, setPage } = useSavedParams();
    const saved = useSavedListings(params);
    const total = saved.data?.totalElements ?? 0;
    const pages = Math.ceil(total / params.size);

    if (saved.isPending) {
        return <ListingGridLoading />;
    }
    if (saved.isError) {
        return <ErrorState error={saved.error} onRetry={() => void saved.refetch()} />;
    }
    if (saved.data.content.length === 0) {
        return (
            <EmptyState
                icon={SearchOffOutlined}
                title={t('saved.empty')}
                hint={t('saved.emptyHint')}
                action={{ label: t('saved.browse'), onClick: () => void navigate(PATHS.browse) }}
            />
        );
    }
    return (
        <div className="flex flex-col gap-6">
            <ul
                className={cn(
                    'm-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                    saved.isPlaceholderData && 'opacity-60',
                )}
            >
                {saved.data.content.map((listing) => (
                    <li key={listing.id}>
                        <ListingCard listing={listing} />
                    </li>
                ))}
            </ul>
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
                        setPage(value);
                    }}
                    className="self-center [&_ul]:justify-center"
                />
            )}
        </div>
    );
}
