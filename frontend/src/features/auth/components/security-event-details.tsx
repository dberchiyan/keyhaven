import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

import type { SecurityEvent } from '../types';
import { SecurityTime } from './security-time';

export interface SecurityEventDetailsProps {
    id: string;
    events: readonly SecurityEvent[];
    isOpen: boolean;
    today: string;
    now: number;
}

/** A folded group's single events; hidden, not unmounted, so the toggle's `aria-controls` always resolves. */
export function SecurityEventDetails({ id, events, isOpen, today, now }: SecurityEventDetailsProps): ReactElement {
    const { t } = useTranslation('auth');
    return (
        <ul id={id} className={cn('m-0 list-none flex-col gap-2 py-0 pr-0 pl-12', isOpen ? 'flex' : 'hidden')}>
            {events.map((event) => (
                <li key={event.id} className="flex flex-wrap gap-x-2">
                    <Typography variant="caption">{t(`securityLog.short.${event.action}`)}</Typography>
                    <Typography variant="caption" color="textSecondary" className="app-tabular">
                        <SecurityTime from={event.occurredAt} to={undefined} today={today} now={now} />
                    </Typography>
                </li>
            ))}
        </ul>
    );
}
