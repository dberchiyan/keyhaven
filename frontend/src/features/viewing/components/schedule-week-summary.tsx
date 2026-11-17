import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDayHeading, formatMinutes, WEEKDAY_ORDER, weekdayName } from '../format';
import type { ViewingSchedule } from '../types';

export interface ScheduleWeekSummaryProps {
    schedule: ViewingSchedule;
}

/** The stored week, Monday first (a US week of hours reads better that way), then the days off. */
export function ScheduleWeekSummary({ schedule }: ScheduleWeekSummaryProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const rangeText = (start: number, end: number): string =>
        `${formatMinutes(start, i18n.language)} – ${formatMinutes(end, i18n.language)}`;
    return (
        <div className="flex flex-col gap-3">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                {WEEKDAY_ORDER.map((weekday) => {
                    const windows = schedule.windows
                        .filter((window) => window.weekday === weekday)
                        .sort((left, right) => left.start - right.start);
                    return (
                        <div key={weekday} className="contents">
                            <Typography component="dt" variant="body2" color="textSecondary">
                                {weekdayName(weekday, i18n.language, 'short')}
                            </Typography>
                            <Typography component="dd" variant="body2" className="app-tabular m-0">
                                {windows.length === 0
                                    ? t('hours.closed')
                                    : windows.map((window) => rangeText(window.start, window.end)).join(' · ')}
                            </Typography>
                        </div>
                    );
                })}
            </dl>
            {schedule.blockedDays.length > 0 && (
                <div className="flex flex-col gap-1">
                    <Typography variant="body2" color="textSecondary">
                        {t('hours.blockedList')}
                    </Typography>
                    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                        {schedule.blockedDays.map((day) => (
                            <li key={day}>
                                <Chip size="small" label={formatDayHeading(day, i18n.language)} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
