import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ComponentType } from 'react';
import type { AccessPart } from '@/features/auth';
import { BrowsePage, HomePage } from '@/features/listing';
import { SettingsPage } from '@/features/settings';
import { PATHS } from '@/shared/lib/paths';

export const NavSection = {
  LISTINGS: 'listings',
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
  /** Loads the page's code on hover or focus, so the click renders at once. */
  preload: () => Promise<unknown>;
}

/** Landlords, agents and admins: Listings first; tenants: Browse first. Settings at the bottom. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    section: NavSection.LISTINGS,
    path: PATHS.home,
    icon: HomeWorkOutlined,
    access: 'section.listings',
    placement: 'main',
    alsoActiveOn: [PATHS.managedListing],
    preload: HomePage.preload,
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
