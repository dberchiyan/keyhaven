import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { RowSkeleton } from '@/shared/components/row-skeleton';

const ROWS = ['a', 'b', 'c'] as const;

/** Agenda rows in their real shape while the list loads, so nothing jumps when it arrives (ARCH-35). */
export function ViewingListLoading(): ReactElement {
    const { t } = useTranslation();
    return (
        <div role="status" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">{t('status.loading')}</span>
            {ROWS.map((row) => (
                <RowSkeleton key={row} leading="icon" />
            ))}
        </div>
    );
}
