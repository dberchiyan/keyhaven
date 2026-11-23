import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import SellOutlined from '@mui/icons-material/SellOutlined';
import { useLocation, useSearchParams } from 'react-router';

import { useAccess, useCurrentUser } from '@/features/auth';
import { browseSearch, parseBrowseParams } from '@/shared/lib/listing-search';
import { PATHS, settingsPath } from '@/shared/lib/paths';

import type { MobileTab } from '../types';

const browseTab = (
    key: 'rent' | 'buy',
    kind: 'rent' | 'sale',
    icon: MobileTab['icon'],
    current: string | undefined,
): MobileTab => ({
    key,
    to: `${PATHS.browse}?${browseSearch({ kind })}`,
    icon,
    isActive: current === kind,
});

/** A lister's third tab is the dashboard; everyone else's is Saved (a visitor's leads to sign-in). */
const middleTab = (isSignedIn: boolean, isLister: boolean, pathname: string): MobileTab =>
    isLister
        ? { key: 'dashboard', to: PATHS.home, icon: HomeWorkOutlined, isActive: false }
        : {
              key: 'saved',
              to: isSignedIn ? PATHS.saved : PATHS.login,
              icon: FavoriteBorderOutlined,
              isActive: pathname.startsWith(PATHS.saved),
          };

/**
 * The phone tab bar's tabs: Rent, Buy, Saved (or the dashboard for listers) and the account —
 * where a visitor goes; a signed-in tenant also gets Viewings. A visitor's Saved and account tabs
 * lead to sign-in.
 */
export const useMobileTabs = (): MobileTab[] => {
    const { data: user } = useCurrentUser();
    const { canAccess } = useAccess();
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    const kind = pathname === PATHS.browse ? parseBrowseParams(searchParams).kind : undefined;
    const isSignedIn = Boolean(user);
    const viewings: MobileTab[] =
        isSignedIn && canAccess('viewing.book')
            ? [
                  {
                      key: 'viewings',
                      to: PATHS.viewings,
                      icon: EventAvailableOutlined,
                      isActive: pathname.startsWith(PATHS.viewings),
                  },
              ]
            : [];
    return [
        browseTab('rent', 'rent', SearchOutlined, kind),
        browseTab('buy', 'sale', SellOutlined, kind),
        middleTab(isSignedIn, isSignedIn && canAccess('home.manage'), pathname),
        ...viewings,
        {
            key: 'account',
            to: isSignedIn ? settingsPath('account') : PATHS.login,
            icon: PersonOutlineOutlined,
            isActive: pathname.startsWith(PATHS.settings),
        },
    ];
};
