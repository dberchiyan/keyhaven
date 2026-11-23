import Button from '@mui/material/Button';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useSearchParams } from 'react-router';

import { useCurrentUser } from '@/features/auth';
import { parseBrowseParams } from '@/shared/lib/listing-search';
import { PATHS } from '@/shared/lib/paths';

import type { SiteTab } from '../types';
import { SiteAccountNav } from './site-account-nav';
import { SiteBrandLink } from './site-brand-link';
import { SiteTabs } from './site-tabs';
import { UserMenu } from './user-menu';

/**
 * The public site's header: brand, catalogue tabs and, on the right, sign-in and "List your home"
 * for a visitor (registration is for listers) or the person's own links and account menu.
 */
export function SiteHeader(): ReactElement {
    const { t } = useTranslation('shell');
    const { data: user } = useCurrentUser();
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    const isBrowsing = pathname === PATHS.browse;
    const params = parseBrowseParams(isBrowsing ? searchParams : new URLSearchParams());
    const houseOrKind: SiteTab = params.type === 'HOUSE' ? 'houses' : params.kind;
    const activeTab = isBrowsing ? houseOrKind : undefined;

    return (
        <header className="sticky top-0 z-20 flex shrink-0 flex-col border-b border-divider bg-background-paper px-4 shadow-bar md:px-8">
            <div className="mx-auto flex h-top-bar-height w-full max-w-page items-center gap-4">
                <SiteBrandLink />
                <nav aria-label={t('site.catalogue')} className="hidden md:block">
                    <SiteTabs activeTab={activeTab} params={params} />
                </nav>
                <div className="ml-auto flex items-center gap-2">
                    {user ? (
                        <>
                            <SiteAccountNav />
                            <UserMenu />
                        </>
                    ) : (
                        <>
                            <Button component={Link} to={PATHS.login} variant="text">
                                {t('site.signIn')}
                            </Button>
                            <Button
                                component={Link}
                                to={`${PATHS.signup}?role=landlord`}
                                variant="contained"
                                className="hidden sm:inline-flex"
                            >
                                {t('site.listHome')}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
