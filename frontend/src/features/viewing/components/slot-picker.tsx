import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { isApiError } from '@/shared/api/api-error';
import { cn } from '@/shared/lib/cn';

import { useSlotPicker } from '../hooks/use-slot-picker';
import type { ViewingSlot } from '../types';
import { SlotDayGrid } from './slot-day-grid';
import { SlotSummary } from './slot-summary';
import { SlotTimes } from './slot-times';

export interface SlotPickerProps {
    listingId: string;
    selected: ViewingSlot | undefined;
    onSelect: (slot: ViewingSlot | undefined) => void;
    disabled?: boolean;
    children?: ReactNode;
}

/**
 * Two columns, as booking tools do it: the fortnight's local days on the left, the chosen day's
 * times on the right, then the chosen slot and the action (`children`). On a phone the columns
 * stack. Closed hours render nothing — the section says so in its own words.
 */
export function SlotPicker({
    listingId,
    selected,
    onSelect,
    disabled = false,
    children,
}: SlotPickerProps): ReactElement | null {
    const { t } = useTranslation(['viewing', 'errors']);
    const { slots, view, chooseDay, page } = useSlotPicker(listingId, onSelect);

    if (slots.isPending) {
        return (
            <div role="status" aria-busy="true" className="grid gap-6 md:grid-cols-[minmax(0,19rem)_1fr]">
                <span className="sr-only">{t('viewing:book.loadingSlots')}</span>
                <Skeleton variant="rounded" className="h-44 w-full" />
                <Skeleton variant="rounded" className="h-44 w-full" />
            </div>
        );
    }
    if (slots.isError) {
        return (
            <Typography variant="body2" color="error" role="alert">
                {t(`errors:${isApiError(slots.error) ? slots.error.code : 'INTERNAL_ERROR'}`)}
            </Typography>
        );
    }
    if (!view) {
        return null;
    }
    return (
        <div className={cn('grid gap-6 md:grid-cols-[minmax(0,19rem)_1fr]', slots.isPlaceholderData && 'opacity-60')}>
            <SlotDayGrid view={view} disabled={disabled} onChooseDay={chooseDay} onPage={page} />
            <div className="flex min-w-0 flex-col gap-4 md:border-l md:border-divider md:pl-6">
                <SlotTimes view={view} selected={selected} disabled={disabled} onSelect={onSelect} onPage={page} />
                {selected && <SlotSummary slot={selected} timeZone={view.data.timeZone} />}
                {children}
            </div>
        </div>
    );
}
