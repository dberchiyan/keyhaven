import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { type ReactElement, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BROWSE_SORTS, type BrowseParams, filtersOf } from '@/shared/lib/listing-search';

import type { DrawerKey } from '../hooks/use-filter-draft';
import type { BrowseFilterChange } from '../types';
import { FilterDrawer } from './filter-drawer';
import { FilterPillRow } from './filter-pill-row';
import { FilterStatusRow } from './filter-status-row';

const MORE_KEYS: readonly DrawerKey[] = ['isPetFriendly', 'isFurnished', 'hasParking', 'moveInAt'];

export interface FilterBarProps {
    params: BrowseParams;
    total: number | undefined;
    onChange: (change: BrowseFilterChange) => void;
    onClear: () => void;
    saveSearch?: ReactNode;
}

/**
 * The toolbar: the pills, the sort on the right and the drawer for the rest (amenities, the
 * move-in date). The drawer remounts on each opening, so its draft starts from the URL every time
 * (ARCH-33).
 */
export function FilterBar({ params, total, onChange, onClear, saveSearch }: FilterBarProps): ReactElement {
    const { t } = useTranslation('listing');
    const filters = filtersOf(params);
    const drawerCount = MORE_KEYS.filter((key) => filters[key] !== undefined).length;
    const [openCount, setOpenCount] = useState(0);
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <FilterPillRow
                    params={params}
                    drawerCount={drawerCount}
                    onChange={onChange}
                    onOpenDrawer={() => {
                        setOpenCount((count) => count + 1);
                        setDrawerOpen(true);
                    }}
                />
                <TextField
                    select
                    size="small"
                    value={params.sort}
                    onChange={(event) => {
                        const sort = BROWSE_SORTS.find((candidate) => candidate === event.target.value);
                        if (sort) {
                            onChange({ sort });
                        }
                    }}
                    slotProps={{ select: { 'aria-label': t('browse.sort') } }}
                    className="hidden w-44 md:ml-auto md:flex"
                >
                    {BROWSE_SORTS.map((option) => (
                        <MenuItem key={option} value={option}>
                            {t(`browse.sortOptions.${option}`)}
                        </MenuItem>
                    ))}
                </TextField>
            </div>
            <FilterStatusRow
                filters={filters}
                total={total}
                onChange={onChange}
                onClear={onClear}
                saveSearch={saveSearch}
            />
            {isDrawerOpen && (
                <FilterDrawer
                    key={openCount}
                    open={isDrawerOpen}
                    filters={filters}
                    onClose={() => {
                        setDrawerOpen(false);
                    }}
                    onApply={(change) => {
                        onChange(change);
                        setDrawerOpen(false);
                    }}
                />
            )}
        </div>
    );
}
