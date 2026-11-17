import Badge from '@mui/material/Badge';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, matchPath, useLocation } from 'react-router';

import { useAccess, useCurrentUser } from '@/features/auth';
import { useUnreadMessages } from '@/features/message';
import { cn } from '@/shared/lib/cn';
import { PATHS } from '@/shared/lib/paths';

import { useMobileTabs } from '../hooks/use-mobile-tabs';

const MAX_BADGE_COUNT = 99;
const TAB_COUNT_WITH_VIEWINGS = 5;

/**
 * The phone's bottom tab bar on the public site, under `md`, with safe-area padding (RESP-5). A
 * listing page replaces it with its own action bar, as native apps do on a detail screen; unread
 * messages ride on the account tab and in its label (A11Y-7).
 */
export function MobileTabBar(): ReactElement | null {
    const { t } = useTranslation('shell');
    const { data: user } = useCurrentUser();
    const can = useAccess();
    const { pathname } = useLocation();
    const tabs = useMobileTabs();
    const unread = useUnreadMessages(Boolean(user) && can('viewing.book'));
    const unreadCount = unread.data?.unread ?? 0;
    if (matchPath(PATHS.listing, pathname)) {
        return null;
    }
    return (
        <nav
            aria-label={t('tabBar.label')}
            className="fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-background-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        >
            <ul
                className={cn(
                    'm-0 grid list-none p-0',
                    tabs.length === TAB_COUNT_WITH_VIEWINGS ? 'grid-cols-5' : 'grid-cols-4',
                )}
            >
                {tabs.map(({ key, to, icon: Icon, isActive }) => (
                    <li key={key}>
                        <Link
                            to={to}
                            aria-current={isActive ? 'page' : undefined}
                            aria-label={
                                key === 'account' && unreadCount > 0
                                    ? t('tabBar.accountUnread', { count: unreadCount })
                                    : undefined
                            }
                            className={cn(
                                'flex min-h-tab-bar-height flex-col items-center justify-center gap-0.5 no-underline transition-colors',
                                isActive ? 'text-primary' : 'text-text-secondary',
                            )}
                        >
                            <Badge
                                badgeContent={key === 'account' ? unreadCount : 0}
                                color="secondary"
                                max={MAX_BADGE_COUNT}
                            >
                                <Icon aria-hidden fontSize="small" />
                            </Badge>
                            <Typography variant="caption" component="span">
                                {t(`tabBar.${key}`, user ? {} : { context: 'visitor' })}
                            </Typography>
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
