import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { useAccess } from '@/features/auth';
import { ErrorState } from '@/shared/components/error-state';
import { PATHS } from '@/shared/lib/paths';

import { useListingViewings } from '../hooks/use-viewing-queries';
import { ViewingAgenda } from './viewing-agenda';
import { ViewingListLoading } from './viewing-list-loading';

export interface ListingViewingsSectionProps {
    listingId: string;
}

/** On a listing's management page: its live viewings ahead with the owner's actions — the title is the page's, so rows skip the home. */
export function ListingViewingsSection({ listingId }: ListingViewingsSectionProps): ReactElement {
    const { t } = useTranslation('viewing');
    const can = useAccess();
    const viewings = useListingViewings(listingId);
    return (
        <Card variant="outlined" component="section" aria-labelledby="listing-viewings-heading">
            <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Typography id="listing-viewings-heading" variant="h6" component="h2">
                        {t('listing.title')}
                    </Typography>
                    <Link component={RouterLink} to={PATHS.viewings} underline="hover">
                        <Typography variant="body2" component="span">
                            {t('listing.all')}
                        </Typography>
                    </Link>
                </div>
                {viewings.isPending ? (
                    <ViewingListLoading />
                ) : viewings.isError ? (
                    <ErrorState error={viewings.error} onRetry={() => void viewings.refetch()} />
                ) : viewings.data.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                        {t('listing.empty')}
                    </Typography>
                ) : (
                    <ViewingAgenda
                        viewings={viewings.data}
                        audience="owner"
                        canDecide={can('viewing.decide')}
                        hideListing
                    />
                )}
            </CardContent>
        </Card>
    );
}
