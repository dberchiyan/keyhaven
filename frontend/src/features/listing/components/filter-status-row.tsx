import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { hasFilters, type SearchFilters } from '@/shared/lib/listing-search';

import type { DrawerKey } from '../hooks/use-filter-draft';
import type { BrowseFilterChange } from '../types';
import { ActiveFilterChips } from './active-filter-chips';

export interface FilterStatusRowProps {
    filters: SearchFilters;
    total: number | undefined;
    onChange: (change: BrowseFilterChange) => void;
    onClear: () => void;
    saveSearch?: ReactNode;
}

/**
 * The count, then removable chips for what the pills do not show — the drawer's filters and a
 * text query from the landing's search (the pills already show their own values) — and Clear.
 */
export function FilterStatusRow({ filters, total, onChange, onClear, saveSearch }: FilterStatusRowProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const chipFilters: SearchFilters = {
        kind: filters.kind,
        ...(filters.isPetFriendly === undefined ? {} : { isPetFriendly: filters.isPetFriendly }),
        ...(filters.isFurnished === undefined ? {} : { isFurnished: filters.isFurnished }),
        ...(filters.hasParking === undefined ? {} : { hasParking: filters.hasParking }),
        ...(filters.moveInOn === undefined ? {} : { moveInOn: filters.moveInOn }),
    };
    const remove = (keys: readonly DrawerKey[]): void => {
        onChange(Object.fromEntries(keys.map((key) => [key, undefined])));
    };
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Typography variant="body2" color="textSecondary" role="status" className="app-tabular whitespace-nowrap">
                {total === undefined
                    ? ''
                    : t('browse.count', {
                          count: total,
                          formatted: new Intl.NumberFormat(i18n.language).format(total),
                      })}
            </Typography>
            {filters.q !== undefined && (
                <Chip
                    size="small"
                    label={t('filters.chip.text', { text: filters.q })}
                    onDelete={() => {
                        onChange({ q: undefined });
                    }}
                    aria-label={t('filters.chip.remove', { filter: filters.q })}
                />
            )}
            <ActiveFilterChips filters={chipFilters} onRemove={remove} />
            {hasFilters(filters) && (
                <Button variant="text" size="small" onClick={onClear}>
                    {t('filters.clear')}
                </Button>
            )}
            <div className="ml-auto">{saveSearch}</div>
        </div>
    );
}
