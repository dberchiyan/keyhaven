import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge, type StatusTone } from '@/shared/components/status-badge';

import type { ListingStatus } from '../types';

const TONES: Record<ListingStatus, StatusTone> = {
    PUBLISHED: 'success',
    DRAFT: 'neutral',
    UNPUBLISHED: 'warning',
    SUSPENDED: 'danger',
};

export interface ListingStatusBadgeProps {
    status: ListingStatus;
    className?: string;
}

/** A listing's status in the shared badge look, one tone per status; the word carries the meaning (STY-15). */
export function ListingStatusBadge({ status, className }: ListingStatusBadgeProps): ReactElement {
    const { t } = useTranslation('listing');
    return (
        <StatusBadge
            tone={TONES[status]}
            label={t(`status.${status}`)}
            {...(className === undefined ? {} : { className })}
        />
    );
}
