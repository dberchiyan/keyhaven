import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

import { formatDayChip, formatDayHeading } from '../format';
import type { ViewingSlotDay } from '../types';

export interface SlotDayCellProps {
    day: ViewingSlotDay;
    isActive: boolean;
    isToday: boolean;
    disabled: boolean;
    onChoose: (day: string) => void;
}

/**
 * One day of the strip as a toggle (`aria-pressed`) whose label says the date and how many times
 * it has. The figure shows on wide screens; on a phone, where seven cells share the width, a dot
 * says the same — both hidden from screen readers, which hear the label.
 */
export function SlotDayCell({ day, isActive, isToday, disabled, onChoose }: SlotDayCellProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const count = day.slots.length;
    const dotTone = isActive ? 'bg-primary-contrast-text' : 'bg-primary';
    return (
        <ButtonBase
            disabled={count === 0 || disabled}
            aria-pressed={isActive}
            aria-label={t('book.dayLabel', { date: formatDayHeading(day.day, i18n.language), count })}
            onClick={() => {
                onChoose(day.day);
            }}
            className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-lg border border-transparent',
                count === 0 && 'text-text-disabled',
                count > 0 && !isActive && 'bg-background hover:border-primary',
                isActive && 'bg-primary text-primary-contrast-text',
                isToday && !isActive && 'border-divider',
            )}
        >
            <Typography variant="calendarDate" component="span">
                {formatDayChip(day.day, i18n.language).day}
            </Typography>
            <Typography
                variant="calendarCount"
                component="span"
                aria-hidden
                className={cn('hidden sm:block', !isActive && count > 0 && 'text-primary')}
            >
                {count === 0 ? '·' : count}
            </Typography>
            <span
                aria-hidden
                className={cn('size-1 rounded-full sm:hidden', count === 0 ? 'bg-transparent' : dotTone)}
            />
        </ButtonBase>
    );
}
