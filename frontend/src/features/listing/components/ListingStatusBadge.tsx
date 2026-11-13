import { useTranslation } from 'react-i18next';
import { StatusBadge, type StatusTone } from '@/shared/components/StatusBadge';
import type { ListingStatus } from '../types';

/** One tone per status (the word carries the meaning). */
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

export function ListingStatusBadge({ status, className }: ListingStatusBadgeProps) {
  const { t } = useTranslation('listing');
  return (
    <StatusBadge
      tone={TONES[status]}
      label={t(`status.${status}`)}
      {...(className === undefined ? {} : { className })}
    />
  );
}
