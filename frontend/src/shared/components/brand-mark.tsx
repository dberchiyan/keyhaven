import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

export interface BrandMarkProps {
    className?: string;
}

/** The Keyhaven house mark — decorative; the product name is always shown as text beside it. */
export function BrandMark({ className }: BrandMarkProps): ReactElement {
    return (
        <svg viewBox="0 0 48 48" className={cn('size-12 shrink-0', className)} aria-hidden focusable="false">
            <rect width="48" height="48" rx="12" className="fill-primary" />
            <path d="M24 9 9 22h4v14h9V26h4v10h9V22h4z" className="fill-primary-contrast-text dark:fill-background" />
            <circle cx="24" cy="20" r="2.4" className="fill-primary" />
        </svg>
    );
}
