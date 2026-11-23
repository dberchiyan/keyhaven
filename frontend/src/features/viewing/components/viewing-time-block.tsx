import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { type DisplayStatus, formatSlotDate, formatSlotTime, zoneName } from '../format';
import type { Viewing } from '../types';
import { ViewingStatusBadge } from './viewing-status-badge';

export interface ViewingTimeBlockProps {
    viewing: Viewing;
    status: DisplayStatus;
    showDate: boolean;
}

/**
 * The row's time block in the home's zone: the date unless a day heading already carries it, the
 * start, then "to end zone". On a phone the status sits at the end of this row, so the title
 * below keeps its full width.
 */
export function ViewingTimeBlock({ viewing, status, showDate }: ViewingTimeBlockProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const zone = viewing.listing.city.timeZone;
    const locale = i18n.language;
    return (
        <div className="flex shrink-0 items-baseline gap-2 sm:w-28 sm:flex-col sm:border-r sm:border-divider sm:pr-4">
            <span className="order-last ml-auto sm:hidden">
                <ViewingStatusBadge status={status} />
            </span>
            {showDate && (
                <Typography variant="caption" color="textSecondary" className="app-tabular">
                    {formatSlotDate(viewing.startsAt, zone, locale)}
                </Typography>
            )}
            <Typography variant="h6" component="p" className="app-tabular whitespace-nowrap">
                {formatSlotTime(viewing.startsAt, zone, locale)}
            </Typography>
            <Typography variant="caption" color="textSecondary" className="app-tabular">
                {t('card.until', {
                    time: formatSlotTime(viewing.endsAt, zone, locale),
                    zone: zoneName(zone, locale),
                })}
            </Typography>
        </div>
    );
}
