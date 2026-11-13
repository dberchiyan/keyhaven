import { useAccess, useCurrentUser } from '@/features/auth';
import { PageLoader } from '@/shared/components/PageLoader';
import { AppLayout } from './AppLayout';
import { SiteLayout } from './SiteLayout';

/**
 * Pages both kinds of people open (`/`, Settings): the dashboard shell for landlords, agents and
 * admins, the public site's layout for tenants and visitors.
 */
export function RoleLayout() {
  const { isPending } = useCurrentUser();
  const can = useAccess();
  if (isPending) {
    return <PageLoader />;
  }
  return can('home.manage') ? <AppLayout /> : <SiteLayout />;
}
