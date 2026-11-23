import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@/shared/components/status-badge';

export interface ShowcaseBadgeProps {
    className?: string;
}

/** Marks a showcase listing of the public demo: seeded, read-only, next to its status badge. */
export function ShowcaseBadge({ className }: ShowcaseBadgeProps): ReactElement {
    const { t } = useTranslation('listing');
    return <StatusBadge tone="info" label={t('showcase.badge')} {...(className === undefined ? {} : { className })} />;
}
