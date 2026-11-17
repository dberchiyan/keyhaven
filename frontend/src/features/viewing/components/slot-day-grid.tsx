import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { WEEK_DAYS, weekdayName, zoneName } from '../format';
import type { SlotPickerView } from '../hooks/use-slot-picker';
import { SlotDayCell } from './slot-day-cell';

export interface SlotDayGridProps {
    view: SlotPickerView;
    disabled: boolean;
    onChooseDay: (day: string) => void;
    onPage: (direction: -1 | 1) => void;
}

/** "November 2026", or "November – December 2026" when the fortnight straddles a month. */
const rangeLabel = (first: string, last: string, locale: string): string => {
    const month = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long' });
    const monthYear = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long', year: 'numeric' });
    const start = new Date(`${first}T12:00:00Z`);
    const end = new Date(`${last}T12:00:00Z`);
    return start.getUTCMonth() === end.getUTCMonth()
        ? monthYear.format(start)
        : `${month.format(start)} – ${monthYear.format(end)}`;
};

/**
 * The fortnight as a calendar (Sunday first, as a US calendar reads), paged with earlier / later,
 * and the zone named under it: the times are the home's own, never the visitor's. Capped in width
 * while the columns stack, so the cells stay the size of a thumb.
 */
export function SlotDayGrid({ view, disabled, onChooseDay, onPage }: SlotDayGridProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const labelId = useId();
    return (
        <div className="flex w-full max-w-sm flex-col gap-3 md:max-w-none">
            <div className="flex items-center gap-1">
                <Typography id={labelId} variant="subtitle1" component="p" className="flex-1">
                    {rangeLabel(view.firstDay, view.lastDay, i18n.language)}
                </Typography>
                <IconButton
                    size="small"
                    aria-label={t('book.earlierWeeks')}
                    disabled={!view.canGoBack || disabled}
                    onClick={() => {
                        onPage(-1);
                    }}
                >
                    <ChevronLeftOutlined />
                </IconButton>
                <IconButton
                    size="small"
                    aria-label={t('book.laterWeeks')}
                    disabled={!view.canGoForward || disabled}
                    onClick={() => {
                        onPage(1);
                    }}
                >
                    <ChevronRightOutlined />
                </IconButton>
            </div>
            <div role="group" aria-labelledby={labelId} className="grid grid-cols-7 gap-1">
                {WEEK_DAYS.map((weekday) => (
                    <Typography
                        key={weekday}
                        variant="caption"
                        component="span"
                        color="textSecondary"
                        aria-hidden
                        className="text-center"
                    >
                        {weekdayName(weekday, i18n.language, 'short')}
                    </Typography>
                ))}
                {view.cells.map((cell, index) =>
                    cell ? (
                        <SlotDayCell
                            key={cell.day}
                            day={cell}
                            isActive={view.active?.day === cell.day}
                            isToday={cell.day === view.today}
                            disabled={disabled}
                            onChoose={onChooseDay}
                        />
                    ) : (
                        <span key={`blank-${String(index)}`} aria-hidden />
                    ),
                )}
            </div>
            <Typography variant="caption" color="textSecondary" className="inline-flex items-center gap-1">
                <PublicOutlined aria-hidden fontSize="inherit" />
                {t('book.zoneNote', { zone: zoneName(view.data.timeZone, i18n.language, 'long') })}
            </Typography>
        </div>
    );
}
