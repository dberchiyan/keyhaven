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

/**
 * The phone tab bar's tabs: Rent, Buy, Saved (or the dashboard for listers) and the account —
 * where a visitor goes; a signed-in tenant also gets Viewings. A visitor's Saved and account tabs
 * lead to sign-in.
 */
export const useMobileTabs = (): MobileTab[] => {
    const { data: user } = useCurrentUser();
    const can = useAccess();
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    const kind = pathname === PATHS.browse ? parseBrowseParams(searchParams).kind : undefined;
    const middle: MobileTab[] =
        user && can('home.manage')
            ? [{ key: 'dashboard', to: PATHS.home, icon: HomeWorkOutlined, isActive: false }]
            : [
                  {
                      key: 'saved',
                      to: user ? PATHS.saved : PATHS.login,
                      icon: FavoriteBorderOutlined,
                      isActive: pathname.startsWith(PATHS.saved),
                  },
              ];
    const viewings: MobileTab[] =
        user && can('viewing.book')
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
        {
            key: 'rent',
            to: `${PATHS.browse}?${browseSearch({ kind: 'rent' })}`,
            icon: SearchOutlined,
            isActive: kind === 'rent',
        },
        {
            key: 'buy',
            to: `${PATHS.browse}?${browseSearch({ kind: 'sale' })}`,
            icon: SellOutlined,
            isActive: kind === 'sale',
        },
        ...middle,
        ...viewings,
        {
            key: 'account',
            to: user ? settingsPath('account') : PATHS.login,
            icon: PersonOutlineOutlined,
            isActive: pathname.startsWith(PATHS.settings),
        },
    ];
};
