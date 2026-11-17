import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { type ReactNode, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/shared/api/apiError';
import { cn } from '@/shared/lib/cn';
import { SLOT_DAYS } from '../api/viewingApi';
import { formatDayChip, formatDayHeading, formatSlotTime, weekdayName, zoneName } from '../format';
import { useViewingSlots } from '../hooks/useViewingQueries';
import type { ViewingSlot, ViewingSlotDay } from '../types';

const DAY_MS = 86_400_000;
const addDays = (day: string, days: number): string =>
    new Date(new Date(`${day}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Sunday first, as a US calendar reads. */
const WEEK = [0, 1, 2, 3, 4, 5, 6] as const;
/** Morning ends at noon, afternoon at five: the three parts of a day people plan by. */
const PARTS = [
    { key: 'morning', from: 0, to: 12 },
    { key: 'afternoon', from: 12, to: 17 },
    { key: 'evening', from: 17, to: 24 },
] as const;

export interface SlotPickerProps {
    listingId: string;
    selected: ViewingSlot | null;
    onSelect: (slot: ViewingSlot | null) => void;
    disabled?: boolean;
    /** What follows the times in the action column: the note and the call to action. */
    children?: ReactNode;
}

/** "November 2026", or "November – December 2026" when the fortnight straddles a month. */
const rangeLabel = (first: string, last: string, locale: string): string => {
    const month = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long' });
    const monthYear = new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        month: 'long',
        year: 'numeric',
    });
    const start = new Date(`${first}T12:00:00Z`);
    const end = new Date(`${last}T12:00:00Z`);
    return start.getUTCMonth() === end.getUTCMonth()
        ? monthYear.format(start)
        : `${month.format(start)} – ${monthYear.format(end)}`;
};

/** The hour of a slot in the home's zone, to group the day's times. */
const hourInZone = (iso: string, timeZone: string): number =>
    Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(iso)));

/**
 * Two columns, as booking tools do it: a fortnight of the home's local days on the left (a
 * figure says how many free times each has), the chosen day's times on the right grouped by
 * morning, afternoon and evening, then the chosen slot and the action. Times are the home's
 * own (the zone is named), never the visitor's. On a phone the columns stack.
 */
export function SlotPicker({ listingId, selected, onSelect, disabled, children }: SlotPickerProps) {
    const { t, i18n } = useTranslation(['viewing', 'errors']);
    const [from, setFrom] = useState<string | undefined>(undefined);
    const [chosenDay, setChosenDay] = useState<string | null>(null);
    const slots = useViewingSlots(listingId, from);
    const daysLabelId = useId();
    const timesLabelId = useId();

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
    const data = slots.data;
    if (!data.open) {
        return null;
    }
    const days: ViewingSlotDay[] = data.days;
    const firstDay = days[0]?.day ?? data.from;
    const lastDay = days[days.length - 1]?.day ?? data.from;
    const firstWithSlots = days.find((day) => day.slots.length > 0) ?? null;
    const active = days.find((day) => day.day === chosenDay && day.slots.length > 0) ?? firstWithSlots;
    const canGoBack = from !== undefined;
    const canGoForward = lastDay < data.horizonEnd;
    const zoneShort = zoneName(data.timeZone, i18n.language);
    const zoneLong = zoneName(data.timeZone, i18n.language, 'long');
    const today = todayIso();
    // The grid starts on the Sunday of the first day, so weekdays line up under their names.
    const leadingBlanks = new Date(`${firstDay}T12:00:00Z`).getUTCDay();
    const cells: (ViewingSlotDay | null)[] = [...Array<null>(leadingBlanks).fill(null), ...days];
    const parts = active
        ? PARTS.map((part) => ({
              ...part,
              slots: active.slots.filter((slot) => {
                  const hour = hourInZone(slot.startsAt, data.timeZone);
                  return hour >= part.from && hour < part.to;
              }),
          })).filter((part) => part.slots.length > 0)
        : [];
    const page = (direction: -1 | 1): void => {
        const next = addDays(data.from, direction * SLOT_DAYS);
        setFrom(direction === -1 && next <= today ? undefined : next);
        setChosenDay(null);
        onSelect(null);
    };

    return (
        <div className={cn('grid gap-6 md:grid-cols-[minmax(0,19rem)_1fr]', slots.isPlaceholderData && 'opacity-60')}>
            {/* Days: capped while the columns are stacked, so the cells stay the size of a thumb. */}
            <div className="flex w-full max-w-sm flex-col gap-3 md:max-w-none">
                <div className="flex items-center gap-1">
                    <Typography id={daysLabelId} variant="subtitle1" component="p" className="flex-1">
                        {rangeLabel(firstDay, lastDay, i18n.language)}
                    </Typography>
                    <IconButton
                        size="small"
                        aria-label={t('viewing:book.earlierWeeks')}
                        disabled={!canGoBack || disabled}
                        onClick={() => {
                            page(-1);
                        }}
                    >
                        <ChevronLeftOutlined />
                    </IconButton>
                    <IconButton
                        size="small"
                        aria-label={t('viewing:book.laterWeeks')}
                        disabled={!canGoForward || disabled}
                        onClick={() => {
                            page(1);
                        }}
                    >
                        <ChevronRightOutlined />
                    </IconButton>
                </div>
                <div role="group" aria-labelledby={daysLabelId} className="grid grid-cols-7 gap-1">
                    {WEEK.map((weekday) => (
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
                    {cells.map((cell, index) => {
                        if (!cell) {
                            return <span key={`blank-${index}`} aria-hidden />;
                        }
                        const count = cell.slots.length;
                        const isActive = active?.day === cell.day;
                        const chip = formatDayChip(cell.day, i18n.language);
                        return (
                            <ButtonBase
                                key={cell.day}
                                disabled={count === 0 || disabled}
                                aria-pressed={isActive}
                                aria-label={t('viewing:book.dayLabel', {
                                    date: formatDayHeading(cell.day, i18n.language),
                                    count,
                                })}
                                onClick={() => {
                                    setChosenDay(cell.day);
                                    onSelect(null);
                                }}
                                className={cn(
                                    'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent',
                                    count === 0 && 'text-text-disabled',
                                    count > 0 && !isActive && 'bg-background hover:border-primary',
                                    isActive && 'bg-primary text-primary-contrast-text',
                                    cell.day === today && !isActive && 'border-divider',
                                )}
                            >
                                <Typography variant="subtitle2" component="span" className="app-tabular leading-none">
                                    {chip.day}
                                </Typography>
                                {/* The figure on wide screens, a dot where seven cells share a phone's width. */}
                                <Typography
                                    variant="caption"
                                    component="span"
                                    aria-hidden
                                    className={cn(
                                        'hidden leading-none sm:block',
                                        !isActive && count > 0 && 'text-primary',
                                    )}
                                >
                                    {count === 0 ? '·' : count}
                                </Typography>
                                <span
                                    aria-hidden
                                    className={cn(
                                        'size-1 rounded-full sm:hidden',
                                        count === 0
                                            ? 'bg-transparent'
                                            : isActive
                                              ? 'bg-primary-contrast-text'
                                              : 'bg-primary',
                                    )}
                                />
                            </ButtonBase>
                        );
                    })}
                </div>
                <Typography variant="caption" color="textSecondary" className="inline-flex items-center gap-1">
                    <PublicOutlined aria-hidden fontSize="inherit" />
                    {t('viewing:book.zoneNote', { zone: zoneLong })}
                </Typography>
            </div>

            {/* Times and the action */}
            <div className="flex min-w-0 flex-col gap-4 md:border-l md:border-divider md:pl-6">
                {active ? (
                    <>
                        <div className="flex flex-col gap-0.5">
                            <Typography id={timesLabelId} variant="subtitle1" component="p">
                                {formatDayHeading(active.day, i18n.language)}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                {t('viewing:book.dayMeta', {
                                    minutes: data.slotMinutes ?? 0,
                                    count: active.slots.length,
                                })}
                            </Typography>
                        </div>
                        <div role="group" aria-labelledby={timesLabelId} className="flex flex-col gap-4">
                            {parts.map((part) => (
                                <div key={part.key} className="flex flex-col gap-2">
                                    <Typography variant="overline" component="p" color="textSecondary">
                                        {t(`viewing:book.${part.key}`)}
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
                                                        onSelect(isSelected ? null : slot);
                                                    }}
                                                    // Narrow padding: three chips share a phone's width without wrapping.
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
                ) : (
                    <div className="flex flex-col gap-2">
                        <Typography variant="subtitle1" component="p">
                            {t('viewing:book.noneInRange')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {canGoForward ? t('viewing:book.tryLater') : t('viewing:book.noneAhead')}
                        </Typography>
                        {canGoForward && (
                            <Button
                                variant="outlined"
                                endIcon={<ChevronRightOutlined aria-hidden />}
                                onClick={() => {
                                    page(1);
                                }}
                                className="self-start"
                            >
                                {t('viewing:book.laterWeeks')}
                            </Button>
                        )}
                    </div>
                )}
                {selected && (
                    <div
                        role="status"
                        className="flex items-center gap-3 rounded-lg bg-badge-active-background px-3 py-2.5 text-badge-active-text"
                    >
                        <EventAvailableOutlined aria-hidden fontSize="small" />
                        <Typography variant="subtitle2" component="p" className="app-tabular">
                            {t('viewing:book.summary', {
                                day: formatDayHeading(zonedDayOf(selected.startsAt, data.timeZone), i18n.language),
                                from: formatSlotTime(selected.startsAt, data.timeZone, i18n.language),
                                to: formatSlotTime(selected.endsAt, data.timeZone, i18n.language),
                                zone: zoneShort,
                            })}
                        </Typography>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}

/** The home's local day of an instant, `YYYY-MM-DD` (en-CA formats as ISO). */
const zonedDayOf = (iso: string, timeZone: string): string =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(iso));
