import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ComponentType } from 'react';
import type { AccessPart } from '@/features/auth';
import { BrowsePage, HomePage } from '@/features/listing';
import { MessagesPage } from '@/features/message';
import { SettingsPage } from '@/features/settings';
import { ViewingsPage } from '@/features/viewing';
import { PATHS } from '@/shared/lib/paths';

export const NavSection = {
    LISTINGS: 'listings',
    VIEWINGS: 'viewings',
    MESSAGES: 'messages',
    BROWSE: 'browse',
    SETTINGS: 'settings',
} as const;
export type NavSection = (typeof NavSection)[keyof typeof NavSection];

export interface NavItem {
    section: NavSection;
    path: string;
    icon: ComponentType<SvgIconProps>;
    /** The part of `ACCESS` that decides who sees it (cosmetic — the backend enforces access). */
    access: AccessPart;
    placement: 'main' | 'bottom';
    /** Other paths that count as this section (a listing's management page under Listings). */
    alsoActiveOn?: readonly string[];
    /** A figure on the icon: requests waiting for an answer, or unread messages. */
    badge?: 'viewingRequests' | 'unreadMessages';
    /** Loads the page's code on hover or focus, so the click renders at once. */
    preload: () => Promise<unknown>;
}

/** The dashboard shell (landlords, agents, admins): Listings, then the public catalogue; Settings at the bottom. */
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
