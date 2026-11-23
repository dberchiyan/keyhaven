import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDayHeading, formatSlotTime, zonedDayOf, zoneName } from '../format';
import type { ViewingSlot } from '../types';

export interface SlotSummaryProps {
    slot: ViewingSlot;
    timeZone: string;
}

/** The chosen time in words with the zone, announced politely as it changes (A11Y-5). */
export function SlotSummary({ slot, timeZone }: SlotSummaryProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    return (
        <div
            role="status"
            className="flex items-center gap-2 rounded-lg bg-badge-active-background px-3 py-2.5 text-badge-active-text"
        >
            <EventAvailableOutlined aria-hidden fontSize="small" />
            <Typography variant="subtitle2" component="p" className="app-tabular">
                {t('book.summary', {
                    day: formatDayHeading(zonedDayOf(slot.startsAt, timeZone), i18n.language),
                    from: formatSlotTime(slot.startsAt, timeZone, i18n.language),
                    to: formatSlotTime(slot.endsAt, timeZone, i18n.language),
                    zone: zoneName(timeZone, i18n.language),
                })}
            </Typography>
        </div>
    );
}
