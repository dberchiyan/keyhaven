import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { ErrorState } from '@/shared/components/error-state';
import { RowSkeleton } from '@/shared/components/row-skeleton';
import { PATHS } from '@/shared/lib/paths';

import { useDeleteSavedSearch, useSavedSearches, useUpdateSavedSearch } from '../hooks/use-saved-search-queries';
import { SavedSearchCard } from './saved-search-card';

/**
 * The tenant's saved searches with every async state handled (ARCH-35); a failed switch or delete
 * shows its error above the list, which stays usable.
 */
export function SavedSearchesSection(): ReactElement {
    const { t } = useTranslation(['savedSearch', 'errors']);
    const searches = useSavedSearches();
    const update = useUpdateSavedSearch();
    const remove = useDeleteSavedSearch();

    if (searches.isPending) {
        return (
            <div aria-busy="true">
                <RowSkeleton leading="icon" trailing={false} />
                <RowSkeleton leading="icon" trailing={false} />
            </div>
        );
    }
    if (searches.isError) {
        return <ErrorState error={searches.error} onRetry={() => void searches.refetch()} />;
    }
    if (searches.data.length === 0) {
        return (
            <div className="flex flex-col items-start gap-3 py-6">
                <Typography variant="h6" component="p">
                    {t('savedSearch:empty')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    {t('savedSearch:emptyHint')}
                </Typography>
                <Button component={RouterLink} to={PATHS.browse} variant="outlined">
                    {t('savedSearch:browse')}
                </Button>
            </div>
        );
    }
    const mutationError = update.error ?? remove.error;
    return (
        <div className="flex flex-col gap-3">
            {mutationError && (
                <Alert severity="error" role="alert">
                    {t(`errors:${mutationError.code}`)}
                </Alert>
            )}
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {searches.data.map((search) => (
                    <li key={search.id}>
                        <SavedSearchCard
                            search={search}
                            isUpdating={update.isPending}
                            isRemoving={remove.isPending}
                            onAlertsChange={(hasEmailAlerts) => {
                                update.mutate({
                                    id: search.id,
                                    request: { name: search.name, hasEmailAlerts, version: search.version },
                                });
                            }}
                            onRemove={() => {
                                remove.mutate(search.id);
                            }}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}
