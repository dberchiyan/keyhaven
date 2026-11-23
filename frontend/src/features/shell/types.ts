import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ComponentType } from 'react';

import type { AccessPart } from '@/features/auth';

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
    access: AccessPart;
    placement: 'main' | 'bottom';
    alsoActiveOn?: readonly string[];
    badge?: 'viewingRequests' | 'unreadMessages';
    preload: () => Promise<unknown>;
}

export type SiteTab = 'rent' | 'sale' | 'houses';

export type MobileTabKey = 'rent' | 'buy' | 'saved' | 'viewings' | 'account' | 'dashboard';

export interface MobileTab {
    key: MobileTabKey;
    to: string;
    icon: ComponentType<SvgIconProps>;
    isActive: boolean;
}

export type FooterColumnKey = 'browse' | 'cities' | 'company';

export interface FooterLink {
    key: string;
    label: string;
    to: string;
    isExternal?: boolean;
}

export interface FooterColumn {
    key: FooterColumnKey;
    links: FooterLink[];
    hasTwoColumns?: boolean;
}
