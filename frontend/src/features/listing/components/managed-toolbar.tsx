import SearchOutlined from '@mui/icons-material/SearchOutlined';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useDebouncedSearch } from '../hooks/use-debounced-search';
import { MANAGED_SORTS } from '../hooks/use-managed-listings-params';
import type { ListingStatusCounts, ManagedListParams } from '../types';
import { ManagedStatusTabs } from './managed-status-tabs';

const SEARCH_MAX_LENGTH = 100;

export interface ManagedToolbarProps {
    params: ManagedListParams;
    total: number | undefined;
    counts: ListingStatusCounts | undefined;
    onChange: (change: Partial<Pick<ManagedListParams, 'status' | 'search' | 'sort'>>) => void;
}

/** Status tabs, search and sort over the owner's listings — all in the URL, so a filtered view is a link. */
export function ManagedToolbar({ params, total, counts, onChange }: ManagedToolbarProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const format = new Intl.NumberFormat(i18n.language);
    const commitSearch = (search: string) => {
        onChange({ search });
    };
    const { search, setSearch } = useDebouncedSearch(params.search, commitSearch);
    return (
        <div className="flex flex-col gap-4 border-b border-divider p-4">
            <ManagedStatusTabs
                status={params.status}
                counts={counts}
                onChange={(status) => {
                    onChange({ status });
                }}
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <TextField
                    size="small"
                    type="search"
                    label={t('manage.filters.search')}
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                    }}
                    slotProps={{
                        htmlInput: { maxLength: SEARCH_MAX_LENGTH },
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchOutlined aria-hidden />
                                </InputAdornment>
                            ),
                        },
                    }}
                    className="w-full sm:max-w-xs"
                />
                <TextField
                    select
                    size="small"
                    label={t('manage.filters.sort')}
                    value={params.sort}
                    onChange={(event) => {
                        const sort = MANAGED_SORTS.find((candidate) => candidate === event.target.value);
                        if (sort) {
                            onChange({ sort });
                        }
                    }}
                    className="w-full sm:w-52"
                >
                    {MANAGED_SORTS.map((option) => (
                        <MenuItem key={option} value={option}>
                            {t(`manage.filters.sortOptions.${option}`)}
                        </MenuItem>
                    ))}
                </TextField>
                <Typography
                    variant="body2"
                    color="textSecondary"
                    role="status"
                    className="app-tabular whitespace-nowrap sm:ml-auto"
                >
                    {total === undefined ? '' : t('manage.count', { count: total, formatted: format.format(total) })}
                </Typography>
            </div>
        </div>
    );
}
