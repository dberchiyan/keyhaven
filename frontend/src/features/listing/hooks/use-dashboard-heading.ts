import { useTranslation } from 'react-i18next';

import { useAccess, useCurrentUser } from '@/features/auth';

import { useManagedListingCounts } from './use-listing-queries';
import { LISTING_STATUSES } from './use-managed-listings-params';

type DashboardScope = 'all' | 'agency' | 'own';

export interface DashboardHeading {
    title: string;
    summary: string;
}

/**
 * The dashboard's title by scope (admins see all, agents their agency's, landlords their own) and
 * its figures — "12 listings · 6 published · 2 drafts", only the statuses that have rows — so the
 * page does not repeat them as tiles. Until the counts arrive the line says whose listings these are.
 */
export const useDashboardHeading = (): DashboardHeading => {
    const { t, i18n } = useTranslation('listing');
    const user = useCurrentUser().data;
    const can = useAccess();
    const counts = useManagedListingCounts();
    const agency = user?.agency?.name ?? '';
    const scope: DashboardScope = can('listing.suspend') ? 'all' : user?.agency ? 'agency' : 'own';
    const titles: Record<DashboardScope, string> = {
        all: t('manage.titleAll'),
        agency: t('manage.titleAgency', { agency }),
        own: t('manage.titleOwn'),
    };
    if (!counts.data) {
        return { title: titles[scope], summary: t(`manage.scope.${scope}`, { agency }) };
    }
    const byStatus = counts.data;
    const format = new Intl.NumberFormat(i18n.language);
    const everything = LISTING_STATUSES.reduce((sum, status) => sum + byStatus[status], 0);
    const summary = [
        t('manage.summary.total', { count: everything, formatted: format.format(everything) }),
        ...LISTING_STATUSES.filter((status) => byStatus[status] > 0).map((status) =>
            t(`manage.summary.${status}`, { formatted: format.format(byStatus[status]) }),
        ),
    ].join(' · ');
    return { title: titles[scope], summary };
};
