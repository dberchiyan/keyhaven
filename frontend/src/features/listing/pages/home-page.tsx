import type { ReactElement } from 'react';
import { Navigate } from 'react-router';

import { useAccess } from '@/features/auth';
import { PATHS } from '@/shared/lib/paths';

import { ManagedListingsDashboard } from '../components/managed-listings-dashboard';

/**
 * `/`: the listings dashboard for people who manage homes; tenants land on Browse. A branch only —
 * the page it renders sets the title and owns the focused <h1> (ARCH-36), and a redirect has
 * neither.
 */
export function HomePage(): ReactElement {
    const can = useAccess();
    if (!can('home.manage')) {
        return <Navigate to={PATHS.browse} replace />;
    }
    return <ManagedListingsDashboard />;
}
