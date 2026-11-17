import SearchOffOutlined from '@mui/icons-material/SearchOffOutlined';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/shared/api/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { cn } from '@/shared/lib/cn';

import type { ListingPage } from '../types';
import { ListingCard } from './listing-card';
import { ListingGridLoading } from './listing-states';

export interface BrowseResultsProps {
    listings: UseQueryResult<ListingPage, ApiError>;
    onClear: () => void;
}

/**
 * The search grid in its four states (ARCH-35); while another page loads, the previous cards stay
 * dimmed instead of jumping to a skeleton (QRY-5).
 */
export function BrowseResults({ listings, onClear }: BrowseResultsProps): ReactElement {
    const { t } = useTranslation('listing');
    if (listings.isPending) {
        return <ListingGridLoading />;
    }
    if (listings.isError) {
        return <ErrorState error={listings.error} onRetry={() => void listings.refetch()} />;
    }
    if (listings.data.content.length === 0) {
        return (
            <EmptyState
                icon={SearchOffOutlined}
                title={t('browse.empty')}
                hint={t('browse.emptyHint')}
                action={{ label: t('filters.clear'), onClick: onClear }}
            />
        );
    }
    return (
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
    );
}
