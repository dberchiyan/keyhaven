import Badge from '@mui/material/Badge';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { matchPath, NavLink, useLocation, useMatch } from 'react-router';

import { useUnreadMessages } from '@/features/message';
import { useViewingSummary } from '@/features/viewing';
import { cn } from '@/shared/lib/cn';

import type { NavItem } from '../types';

export interface NavItemLinkProps {
    item: NavItem;
    isCollapsed: boolean;
    onNavigate?: () => void;
}

export function NavItemLink({ item, isCollapsed, onNavigate }: NavItemLinkProps): ReactElement {
    const { t } = useTranslation('shell');
    const exact = item.path === '/';
    const { pathname } = useLocation();
    const isActive =
        useMatch({ path: item.path, end: exact }) !== null ||
        (item.alsoActiveOn ?? []).some((path) => matchPath(path, pathname) !== null);
    const summary = useViewingSummary(item.badge === 'viewingRequests');
    const unread = useUnreadMessages(item.badge === 'unreadMessages');
    const count =
        item.badge === 'viewingRequests'
            ? (summary.data?.requested ?? 0)
            : item.badge === 'unreadMessages'
              ? (unread.data?.unread ?? 0)
              : 0;
    const label =
        count > 0
            ? t(item.badge === 'unreadMessages' ? 'nav.withUnread' : 'nav.withBadge', {
                  label: t(`nav.${item.section}`),
                  count,
              })
            : t(`nav.${item.section}`);
    const Icon = item.icon;

    const link = (
        <ListItemButton
            component={NavLink}
            to={item.path}
            end={exact}
            onClick={onNavigate}
            onMouseEnter={() => void item.preload()}
            onFocus={() => void item.preload()}
            aria-label={isCollapsed ? label : undefined}
            className={cn(
                'relative min-h-12 gap-3 rounded-sm px-3 text-sidebar-text hover:bg-sidebar-hover',
                isCollapsed && 'justify-center px-0',
                isActive && 'bg-sidebar-active text-sidebar-active-text hover:bg-sidebar-active',
            )}
        >
            {isActive && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-sm bg-sidebar-indicator" />}
            <ListItemIcon className="min-w-0 text-inherit">
                <Badge badgeContent={count} color="secondary" max={99} overlap="circular">
                    <Icon aria-hidden />
                </Badge>
            </ListItemIcon>
            {!isCollapsed && <ListItemText primary={t(`nav.${item.section}`)} />}
        </ListItemButton>
    );

    return isCollapsed ? (
        <Tooltip title={label} placement="right">
            {link}
        </Tooltip>
    ) : (
        link
    );
}
