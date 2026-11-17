import type { ReactElement } from 'react';

import { useAccess, useCurrentUser } from '@/features/auth';
import { PageLoader } from '@/shared/components/page-loader';

import { AppLayout } from './app-layout';
import { SiteLayout } from './site-layout';

/**
 * Pages both kinds of people open (`/`, Settings): the dashboard shell for landlords, agents and
 * admins, the public site's layout for tenants and visitors.
 */
export function RoleLayout(): ReactElement {
    const { isPending } = useCurrentUser();
    const can = useAccess();
    if (isPending) {
        return <PageLoader />;
    }
    return can('home.manage') ? <AppLayout /> : <SiteLayout />;
}
