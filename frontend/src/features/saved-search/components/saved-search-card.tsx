import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Card from '@mui/material/Card';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { browseSearch } from '@/shared/lib/listing-search';
import { PATHS } from '@/shared/lib/paths';

import { fromCriteria } from '../schemas';
import type { SavedSearch } from '../types';
import { FilterSummary } from './filter-summary';

export interface SavedSearchCardProps {
    search: SavedSearch;
    isUpdating: boolean;
    isRemoving: boolean;
    onAlertsChange: (hasEmailAlerts: boolean) => void;
    onRemove: () => void;
}

/**
 * One saved search: its name opens the results, the filters in words, when the last email went
 * (a UTC date, QRY-22), the alerts switch and delete — the delete button names the search, since
 * it is icon-only (A11Y-7).
 */
export function SavedSearchCard({
    search,
    isUpdating,
    isRemoving,
    onAlertsChange,
    onRemove,
}: SavedSearchCardProps): ReactElement {
    const { t, i18n } = useTranslation('savedSearch');
    const filters = fromCriteria(search.criteria);
    const day = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeZone: 'UTC' });
    return (
        <Card variant="outlined" className="flex flex-col gap-4 p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-2">
                    <Typography variant="h6" component="h3" className="truncate">
                        <RouterLink
                            to={`${PATHS.browse}?${browseSearch(filters)}`}
                            className="text-inherit no-underline hover:underline"
                        >
                            {search.name}
                        </RouterLink>
                    </Typography>
                    <FilterSummary filters={filters} />
                    <Typography variant="caption" color="textSecondary">
                        {search.lastNotifiedAt
                            ? t('lastSent', { date: day.format(new Date(search.lastNotifiedAt)) })
                            : t('notSentYet')}
                    </Typography>
                </div>
                <IconButton aria-label={t('delete', { name: search.name })} disabled={isRemoving} onClick={onRemove}>
                    <DeleteOutlined aria-hidden />
                </IconButton>
            </div>
            <FormControlLabel
                control={
                    <Switch
                        checked={search.hasEmailAlerts}
                        disabled={isUpdating}
                        onChange={(_event, checked) => {
                            onAlertsChange(checked);
                        }}
                    />
                }
                label={t('alerts')}
            />
        </Card>
    );
}
