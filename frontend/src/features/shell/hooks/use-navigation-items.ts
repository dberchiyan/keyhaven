import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';

import { useAccess } from '@/features/auth';
import { BrowsePage, HomePage } from '@/features/listing';
import { MessagesPage } from '@/features/message';
import { SettingsPage } from '@/features/settings';
import { ViewingsPage } from '@/features/viewing';
import { PATHS } from '@/shared/lib/paths';

import { type NavItem, NavSection } from '../types';

export const NAV_ITEMS: readonly NavItem[] = [
    {
        section: NavSection.LISTINGS,
        path: PATHS.home,
        icon: HomeWorkOutlined,
        access: 'section.listings',
        placement: 'main',
        alsoActiveOn: [PATHS.managedListing, PATHS.newListing, PATHS.editListing],
        preload: HomePage.preload,
    },
    {
        section: NavSection.VIEWINGS,
        path: PATHS.viewings,
        icon: EventAvailableOutlined,
        access: 'viewing.manage',
        placement: 'main',
        badge: 'viewingRequests',
        preload: ViewingsPage.preload,
    },
    {
        section: NavSection.MESSAGES,
        path: PATHS.messages,
        icon: ForumOutlined,
        access: 'section.messages',
        placement: 'main',
        alsoActiveOn: [PATHS.conversation],
        badge: 'unreadMessages',
        preload: MessagesPage.preload,
    },
    {
        section: NavSection.BROWSE,
        path: PATHS.browse,
        icon: SearchOutlined,
        access: 'section.browse',
        placement: 'main',
        alsoActiveOn: [PATHS.listing],
        preload: BrowsePage.preload,
    },
    {
        section: NavSection.SETTINGS,
        path: PATHS.settings,
        icon: SettingsOutlined,
        access: 'section.settings',
        placement: 'bottom',
        preload: SettingsPage.preload,
    },
];

/** Menu items the signed-in user's role uses (see `ACCESS`), split into the main list and the bottom group. */
export const useNavigationItems = (): { main: NavItem[]; bottom: NavItem[] } => {
    const { canAccess } = useAccess();
    const visible = NAV_ITEMS.filter((item) => canAccess(item.access));
    return {
        main: visible.filter((item) => item.placement === 'main'),
        bottom: visible.filter((item) => item.placement === 'bottom'),
    };
};
