import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

import { formatDayHeading, formatSlotTime } from '../format';
import type { SlotPickerView } from '../hooks/use-slot-picker';
import type { ViewingSlot } from '../types';

export interface SlotTimesProps {
    view: SlotPickerView;
    selected: ViewingSlot | undefined;
    disabled: boolean;
    onSelect: (slot: ViewingSlot | undefined) => void;
    onPage: (direction: -1 | 1) => void;
}

/**
 * The chosen day's times as toggles grouped by part of the day; narrow padding lets three share
 * a phone's width without wrapping. A fortnight without times offers the next one, or says none
 * lie ahead.
 */
export function SlotTimes({ view, selected, disabled, onSelect, onPage }: SlotTimesProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const labelId = useId();
    const { active, data } = view;
    if (!active) {
        return (
            <div className="flex flex-col gap-2">
                <Typography variant="subtitle1" component="p">
                    {t('book.noneInRange')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    {view.canGoForward ? t('book.tryLater') : t('book.noneAhead')}
                </Typography>
                {view.canGoForward && (
                    <Button
                        variant="outlined"
                        endIcon={<ChevronRightOutlined aria-hidden />}
                        onClick={() => {
                            onPage(1);
                        }}
                        className="self-start"
                    >
                        {t('book.laterWeeks')}
                    </Button>
                )}
            </div>
        );
    }
    return (
        <>
            <div className="flex flex-col gap-2">
                <Typography id={labelId} variant="subtitle1" component="p">
                    {formatDayHeading(active.day, i18n.language)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    {t('book.dayMeta', { minutes: data.slotMinutes ?? 0, count: active.slots.length })}
                </Typography>
            </div>
            <div role="group" aria-labelledby={labelId} className="flex flex-col gap-4">
                {view.parts.map((part) => (
                    <div key={part.key} className="flex flex-col gap-2">
                        <Typography variant="overline" component="p" color="textSecondary">
                            {t(`book.${part.key}`)}
                        </Typography>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                            {part.slots.map((slot) => {
                                const isSelected = selected?.startsAt === slot.startsAt;
                                return (
                                    <Button
                                        key={slot.startsAt}
                                        variant={isSelected ? 'contained' : 'outlined'}
                                        aria-pressed={isSelected}
                                        disabled={disabled}
                                        onClick={() => {
                                            onSelect(isSelected ? undefined : slot);
                                        }}
                                        className={cn(
                                            'app-tabular px-1 whitespace-nowrap',
                                            !isSelected && 'bg-background-paper',
                                        )}
                                    >
                                        {formatSlotTime(slot.startsAt, data.timeZone, i18n.language)}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
