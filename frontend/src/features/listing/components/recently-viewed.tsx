import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUser } from '@/features/auth';

import { useRecentlyViewed } from '../hooks/use-listing-queries';
import { useLocalRecentlyViewed } from '../hooks/use-recently-viewed-ids';
import { ListingStrip } from './listing-strip';

/**
 * The homes this person (or, signed out, this browser) opened lately, as a side panel beside the
 * catalogue's grid; nothing for a first visit.
 */
export function RecentlyViewed(): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const { data: user } = useCurrentUser();
    const localIds = useLocalRecentlyViewed();
    const recent = useRecentlyViewed(user, localIds);
    const count = recent.data?.length ?? 0;
    return (
        <ListingStrip
            id="recent-heading"
            title={t('browse.recent')}
            subtitle={t('browse.recentHint')}
            {...(count > 0 ? { countLabel: new Intl.NumberFormat(i18n.language).format(count) } : {})}
            titleIcon={<HistoryOutlined />}
            listings={recent.data ?? []}
            isPanel
        />
    );
}
