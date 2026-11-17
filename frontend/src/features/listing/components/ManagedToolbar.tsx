import SearchOutlined from '@mui/icons-material/SearchOutlined';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { trackScrollEdges } from '@/shared/lib/scrollEdges';
import { LISTING_STATUSES, MANAGED_SORTS } from '../hooks/useManagedListingsParams';
import type { ListingStatus, ManagedListParams, ListingStatusCounts } from '../types';

/** Typing pauses this long before the search goes to the URL (and the API). */
const SEARCH_DEBOUNCE_MS = 300;
const ALL = 'ALL';
type Tab = ListingStatus | typeof ALL;

export interface ManagedToolbarProps {
    params: ManagedListParams;
    total: number | undefined;
    /** How many listings sit in each status — on the tabs, so the filter says what it holds. */
    counts: ListingStatusCounts | undefined;
    onChange: (change: Partial<Pick<ManagedListParams, 'status' | 'search' | 'sort'>>) => void;
}

/** Status tabs with their counts (scroll sideways on phones), search and sort — all in the URL. */
export function ManagedToolbar({ params, total, counts, onChange }: ManagedToolbarProps) {
    const { t, i18n } = useTranslation('listing');
    const [search, setSearch] = useState(params.search);
    const [urlSearch, setUrlSearch] = useState(params.search);
    const format = new Intl.NumberFormat(i18n.language);

    // The URL changed from outside (back/forward, "clear filters"): show what it says.
    if (params.search !== urlSearch) {
        setUrlSearch(params.search);
        setSearch(params.search);
    }

    useEffect(() => {
        if (search === params.search) {
            return undefined;
        }
        const timer = setTimeout(() => {
            onChange({ search });
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
        };
    }, [search, params.search, onChange]);

    const countOf = (status: Tab): number | undefined =>
        counts === undefined
            ? undefined
            : status === ALL
              ? LISTING_STATUSES.reduce((sum, key) => sum + counts[key], 0)
              : counts[status];
    // A status nobody has (suspended, for most owners) is not offered — unless it is the filter.
    const tabs = ([ALL, ...LISTING_STATUSES] as const satisfies readonly Tab[]).filter(
        (status) => status === ALL || status === params.status || (countOf(status) ?? 1) > 0,
    );

    return (
        <div className="flex flex-col gap-3 border-b border-divider p-4">
            <div ref={trackScrollEdges} className="app-scroll-fade app-scroll-quiet -mx-4 overflow-x-auto px-4">
                <ToggleButtonGroup
                    exclusive
                    value={params.status ?? ALL}
                    aria-label={t('manage.filters.status')}
                    onChange={(_event, value: string | null) => {
                        if (value !== null) {
                            onChange({
                                status: LISTING_STATUSES.find((candidate) => candidate === value),
                            });
                        }
                    }}
                >
                    {tabs.map((status) => {
                        const count = countOf(status);
                        const selected = (params.status ?? ALL) === status;
                        return (
                            <ToggleButton key={status} value={status} className="gap-2">
                                {status === ALL ? t('manage.filters.all') : t(`status.${status}`)}
                                {count !== undefined && (
                                    <Typography
                                        variant="caption"
                                        component="span"
                                        aria-label={t('manage.filters.count', { count })}
                                        className={cn(
                                            'app-tabular inline-flex min-w-5 items-center justify-center rounded-full px-1.5',
                                            selected
                                                ? 'bg-badge-active-background text-badge-active-text'
                                                : 'bg-badge-neutral-background text-badge-neutral-text',
                                        )}
                                    >
                                        {format.format(count)}
                                    </Typography>
                                )}
                            </ToggleButton>
                        );
                    })}
                </ToggleButtonGroup>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <TextField
                    size="small"
                    type="search"
                    label={t('manage.filters.search')}
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                    }}
                    slotProps={{
                        htmlInput: { maxLength: 100 },
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
                    {total === undefined
                        ? ''
                        : t('manage.count', {
                              count: total,
                              formatted: format.format(total),
                          })}
                </Typography>
            </div>
        </div>
    );
}
