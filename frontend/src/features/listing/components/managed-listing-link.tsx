import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { managedListingPath } from '@/shared/lib/paths';

import { usePrefetchManagedListing } from '../hooks/use-managed-listing-queries';

export interface ManagedListingLinkProps {
    listingId: string;
    title: string;
}

/**
 * The title of a dashboard row as a stretched link, so the whole row opens the listing while the name stays the one
 * `<a>` (A11Y-1); hover or focus prefetches the management page (QRY-7).
 */
export function ManagedListingLink({ listingId, title }: ManagedListingLinkProps): ReactElement {
    const { t } = useTranslation('listing');
    const prefetch = usePrefetchManagedListing();
    return (
        <Link
            to={managedListingPath(listingId)}
            aria-label={t('manage.open', { title })}
            onMouseEnter={() => {
                prefetch(listingId);
            }}
            onFocus={() => {
                prefetch(listingId);
            }}
            className="text-inherit no-underline after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-primary"
        >
            {title}
        </Link>
    );
}
