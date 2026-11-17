import { useTranslation } from 'react-i18next';
import { StatusBadge, type StatusTone } from '@/shared/components/StatusBadge';
import type { DisplayStatus } from '../format';

/** One tone per state (the word carries the meaning). */
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

export function ViewingStatusBadge({ status, className }: ViewingStatusBadgeProps) {
    const { t } = useTranslation('viewing');
    return (
        <StatusBadge
            tone={TONES[status]}
            label={t(`status.${status}`)}
            {...(className === undefined ? {} : { className })}
        />
    );
}
