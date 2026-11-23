import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge, type StatusTone } from '@/shared/components/status-badge';

import type { DisplayStatus } from '../format';

const TONES: Record<DisplayStatus, StatusTone> = {
    REQUESTED: 'warning',
    CONFIRMED: 'success',
    HELD: 'info',
    DECLINED: 'danger',
    CANCELLED: 'neutral',
    EXPIRED: 'neutral',
};

export interface ViewingStatusBadgeProps {
    status: DisplayStatus;
    className?: string;
}

/** One tone per state from the shared status look (STY-15); the word carries the meaning (A11Y-6). */
export function ViewingStatusBadge({ status, className }: ViewingStatusBadgeProps): ReactElement {
    const { t } = useTranslation('viewing');
    return (
        <StatusBadge
            tone={TONES[status]}
            label={t(`status.${status}`)}
            {...(className === undefined ? {} : { className })}
        />
    );
}
