import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import SellOutlined from '@mui/icons-material/SellOutlined';
import Badge from '@mui/material/Badge';
import Typography from '@mui/material/Typography';
import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import { useTranslation } from 'react-i18next';
import { Link, matchPath, useLocation, useSearchParams } from 'react-router';
import { useAccess, useCurrentUser } from '@/features/auth';
import { useUnreadMessages } from '@/features/message';
import { cn } from '@/shared/lib/cn';
import { browseSearch, parseBrowseParams } from '@/shared/lib/listingSearch';
import { PATHS, settingsPath } from '@/shared/lib/paths';

type TabKey = 'rent' | 'buy' | 'saved' | 'viewings' | 'account' | 'dashboard';

interface Tab {
    key: TabKey;
    to: string;
    icon: ComponentType<SvgIconProps>;
    active: boolean;
}

/**
 * The phone's bottom tab bar (the public site only, under `md`): Rent, Buy, Saved and the
 * account — the four places a visitor goes; a signed-in tenant gets Viewings as a fifth. A
 * listing page replaces it with its own action bar (`ListingActionBar`), as native apps do on a
 * detail screen.
 */
export function MobileTabBar() {
    const { t } = useTranslation('shell');
    const { data: user } = useCurrentUser();
    const can = useAccess();
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    // A tenant's unread messages sit on the account tab: the inbox is reached from the account
    // menu, a viewing's card, or the header on wider screens.
    const unread = useUnreadMessages(Boolean(user) && can('viewing.book'));
    const unreadCount = unread.data?.unread ?? 0;
    if (matchPath(PATHS.listing, pathname)) {
        return null;
    }
    const onBrowse = pathname === PATHS.browse;
    const kind = onBrowse ? parseBrowseParams(searchParams).kind : null;
    const tabs: Tab[] = [
        {
            key: 'rent',
            to: `${PATHS.browse}?${browseSearch({ kind: 'rent' })}`,
            icon: SearchOutlined,
            active: kind === 'rent',
        },
        {
            key: 'buy',
            to: `${PATHS.browse}?${browseSearch({ kind: 'sale' })}`,
            icon: SellOutlined,
            active: kind === 'sale',
        },
        ...(user && can('home.manage')
            ? [{ key: 'dashboard' as const, to: PATHS.home, icon: HomeWorkOutlined, active: false }]
            : [
                  {
                      key: 'saved' as const,
                      to: user ? PATHS.saved : PATHS.login,
                      icon: FavoriteBorderOutlined,
                      active: pathname.startsWith(PATHS.saved),
                  },
              ]),
        ...(user && can('viewing.book')
            ? [
                  {
                      key: 'viewings' as const,
                      to: PATHS.viewings,
                      icon: EventAvailableOutlined,
                      active: pathname.startsWith(PATHS.viewings),
                  },
              ]
            : []),
        {
            key: 'account',
            to: user ? settingsPath('account') : PATHS.login,
            icon: PersonOutlineOutlined,
            active: pathname.startsWith(PATHS.settings),
        },
    ];
    return (
        <nav
            aria-label={t('tabBar.label')}
            // The arbitrary padding: the home indicator's safe area on phones (ux.md).
            className="fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-background-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        >
            <ul className={cn('m-0 grid list-none p-0', tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4')}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <li key={tab.key}>
                            <Link
                                to={tab.to}
                                aria-current={tab.active ? 'page' : undefined}
                                aria-label={
                                    tab.key === 'account' && unreadCount > 0
                                        ? t('tabBar.accountUnread', { count: unreadCount })
                                        : undefined
                                }
                                className={cn(
                                    'flex min-h-14 flex-col items-center justify-center gap-0.5 no-underline transition-colors',
                                    tab.active ? 'text-primary' : 'text-text-secondary',
                                )}
                            >
                                <Badge
                                    badgeContent={tab.key === 'account' ? unreadCount : 0}
                                    color="secondary"
                                    max={99}
                                >
                                    <Icon aria-hidden fontSize="small" />
                                </Badge>
                                <Typography variant="caption" component="span" className="font-medium">
                                    {t(`tabBar.${tab.key}`, user ? {} : { context: 'visitor' })}
                                </Typography>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
