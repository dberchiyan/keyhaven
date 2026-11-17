import Skeleton from '@mui/material/Skeleton';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

const SKELETON_CARDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const;

/** The grid while it loads: cards in the real shape, so nothing jumps when they arrive. */
export function ListingGridLoading(): ReactElement {
    const { t } = useTranslation();
    return (
        <div
            role="status"
            aria-busy="true"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
            <span className="sr-only">{t('status.loading')}</span>
            {SKELETON_CARDS.map((id) => (
                <div key={id} aria-hidden className="flex flex-col gap-2">
                    <Skeleton variant="rounded" className="aspect-4/3 h-auto w-full" />
                    <Skeleton variant="text" className="w-1/3" />
                    <Skeleton variant="text" className="w-3/4" />
                    <Skeleton variant="text" className="w-1/2" />
                </div>
            ))}
        </div>
    );
}
