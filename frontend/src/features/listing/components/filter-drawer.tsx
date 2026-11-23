import CloseOutlined from '@mui/icons-material/CloseOutlined';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { SearchFilters } from '@/shared/lib/listing-search';

import { type DrawerChange, useFilterDraft } from '../hooks/use-filter-draft';
import { FilterDrawerFields } from './filter-drawer-fields';

export interface FilterDrawerProps {
    open: boolean;
    filters: SearchFilters;
    onClose: () => void;
    onApply: (change: DrawerChange) => void;
}

/**
 * The detailed filters in a side sheet, applied together; on a phone a bottom sheet whose height
 * in `dvh` leaves the page's top visible (RESP-4, RESP-6) — the drawer variant is behaviour CSS
 * cannot express, hence `useMediaQuery` (RESP-7).
 */
export function FilterDrawer({ open, filters, onClose, onApply }: FilterDrawerProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
    const titleId = useId();
    const { draft, set, clear, change, count, isCounting } = useFilterDraft(filters, open);
    return (
        <Drawer
            anchor={isPhone ? 'bottom' : 'right'}
            open={open}
            onClose={onClose}
            aria-labelledby={titleId}
            slotProps={{
                paper: {
                    className: isPhone
                        ? 'max-h-[85dvh] rounded-t-xl border-0'
                        : 'w-full max-w-md border-0 border-l border-divider',
                },
            }}
        >
            <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-2">
                <Typography id={titleId} variant="h6" component="h2">
                    {t('filters.title')}
                </Typography>
                <IconButton aria-label={t('filters.close')} onClick={onClose} edge="end">
                    <CloseOutlined aria-hidden />
                </IconButton>
            </div>
            <FilterDrawerFields draft={draft} set={set} isForRent={filters.kind === 'rent'} />
            <div className="flex items-center justify-between gap-4 border-t border-divider px-5 py-3">
                <Button variant="text" onClick={clear}>
                    {t('filters.clearAll')}
                </Button>
                <Button
                    variant="contained"
                    aria-busy={isCounting}
                    onClick={() => {
                        onApply(change());
                    }}
                >
                    {count === undefined
                        ? t('filters.show')
                        : t('filters.showCount', {
                              count,
                              formatted: new Intl.NumberFormat(i18n.language).format(count),
                          })}
                </Button>
            </div>
        </Drawer>
    );
}
