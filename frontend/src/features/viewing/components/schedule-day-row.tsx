import AddOutlined from '@mui/icons-material/AddOutlined';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { type Control, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useFieldMessage } from '@/shared/hooks/use-field-message';

import { weekdayName } from '../format';
import { DEFAULT_RANGE, NEXT_RANGE_END, SCHEDULE_LIMITS, type ScheduleOutput, type ScheduleValues } from '../schemas';
import { type ScheduleRange, ScheduleRangeRow } from './schedule-range-row';

export interface ScheduleDayRowProps {
    control: Control<ScheduleValues, unknown, ScheduleOutput>;
    weekday: number;
    day: ScheduleValues['days'][number];
    error: string | undefined;
    onRangesChange: (ranges: ScheduleRange[]) => void;
}

/**
 * One weekday: a switch, the day's name, and up to three time ranges in the home's zone. Opening
 * a day with no range adds the default evening, so a switched-on day is never empty; a new range
 * starts where the last one ends. The day's error keeps a reserved line (FORM-2).
 */
export function ScheduleDayRow({ control, weekday, day, error, onRangesChange }: ScheduleDayRowProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const fieldMessage = useFieldMessage();
    const name = weekdayName(weekday, i18n.language, 'long');
    return (
        <div className="flex flex-col gap-2 rounded-lg border border-divider px-3 py-2">
            <div className="flex items-center gap-4">
                <Controller
                    control={control}
                    name={`days.${weekday}.enabled`}
                    render={({ field }) => (
                        <Switch
                            checked={field.value}
                            onChange={(event) => {
                                field.onChange(event.target.checked);
                                if (event.target.checked && day.ranges.length === 0) {
                                    onRangesChange([{ ...DEFAULT_RANGE }]);
                                }
                            }}
                            slotProps={{ input: { 'aria-label': t('hours.openOn', { day: name }) } }}
                        />
                    )}
                />
                <Typography variant="body1" className="w-24 shrink-0">
                    {name}
                </Typography>
                {!day.enabled && (
                    <Typography variant="body2" color="textSecondary">
                        {t('hours.closed')}
                    </Typography>
                )}
            </div>
            {day.enabled && (
                <div className="flex flex-col gap-2 pl-0 sm:pl-14">
                    {day.ranges.map((range, index) => (
                        <ScheduleRangeRow
                            key={`${String(weekday)}-${String(index)}`}
                            range={range}
                            canRemove={day.ranges.length > 1}
                            onChange={(next) => {
                                onRangesChange(
                                    day.ranges.map((entry, position) => (position === index ? next : entry)),
                                );
                            }}
                            onRemove={() => {
                                onRangesChange(day.ranges.filter((_entry, position) => position !== index));
                            }}
                        />
                    ))}
                    {day.ranges.length < SCHEDULE_LIMITS.windowsPerDay && (
                        <Button
                            size="small"
                            variant="text"
                            startIcon={<AddOutlined aria-hidden />}
                            onClick={() => {
                                const last = day.ranges[day.ranges.length - 1];
                                onRangesChange([
                                    ...day.ranges,
                                    { start: last?.end ?? DEFAULT_RANGE.start, end: NEXT_RANGE_END },
                                ]);
                            }}
                            className="self-start"
                        >
                            {t('hours.addRange')}
                        </Button>
                    )}
                </div>
            )}
            <Typography variant="caption" color="error" role={error ? 'alert' : undefined}>
                {fieldMessage(error)}
            </Typography>
        </div>
    );
}
