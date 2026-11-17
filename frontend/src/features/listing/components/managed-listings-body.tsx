import SearchOffOutlined from '@mui/icons-material/SearchOffOutlined';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAccess } from '@/features/auth';
import type { ApiError } from '@/shared/api/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PATHS } from '@/shared/lib/paths';

import type { ManagedListingPage } from '../types';
import { ListingGridLoading } from './listing-states';
import { ManagedListingCards } from './managed-listing-cards';
import { ManagedListingTable } from './managed-listing-table';

export interface ManagedListingsBodyProps {
    listings: UseQueryResult<ManagedListingPage, ApiError>;
    isUnfiltered: boolean;
    onClearFilters: () => void;
}

/**
 * The list's four states (ARCH-35). With no listing at all — not a filter — the first one is the
 * thing to do. Table or cards is behaviour CSS cannot express, so `useMediaQuery` decides (RESP-7).
 */
export function ManagedListingsBody({
    listings,
    isUnfiltered,
    onClearFilters,
}: ManagedListingsBodyProps): ReactElement {
    const { t } = useTranslation('listing');
    const navigate = useNavigate();
    const can = useAccess();
    const theme = useTheme();
    const isTable = useMediaQuery(theme.breakpoints.up('md'));
    if (listings.isPending) {
        return <ListingGridLoading />;
    }
    if (listings.isError) {
        return <ErrorState error={listings.error} onRetry={() => void listings.refetch()} />;
    }
    if (listings.data.content.length === 0) {
        return isUnfiltered && can('listing.create') ? (
            <EmptyState
                icon={SearchOffOutlined}
                title={t('manage.first')}
                hint={t('manage.firstHint')}
                action={{ label: t('manage.new'), onClick: () => void navigate(PATHS.newListing) }}
            />
        ) : (
            <EmptyState
                icon={SearchOffOutlined}
                title={t('manage.empty')}
                hint={t('manage.emptyHint')}
                action={{ label: t('manage.clear'), onClick: onClearFilters }}
            />
        );
    }
    return isTable ? (
        <ManagedListingTable listings={listings.data.content} />
    ) : (
        <ManagedListingCards listings={listings.data.content} />
    );
}
