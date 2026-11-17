import Button from '@mui/material/Button';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation, useSearchParams } from 'react-router';

import { useAccess, useCurrentUser } from '@/features/auth';
import { parseBrowseParams } from '@/shared/lib/listing-search';
import { PATHS } from '@/shared/lib/paths';

import type { SiteTab } from '../types';
import { MessagesLink } from './messages-link';
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
    const can = useAccess();
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    const isBrowsing = pathname === PATHS.browse;
    const params = parseBrowseParams(isBrowsing ? searchParams : new URLSearchParams());
    const houseOrKind: SiteTab = params.type === 'HOUSE' ? 'houses' : params.kind;
    const activeTab = isBrowsing ? houseOrKind : undefined;

    return (
        <header className="sticky top-0 z-20 flex shrink-0 flex-col border-b border-divider bg-background-paper px-4 shadow-bar md:px-8">
            <div className="mx-auto flex h-top-bar-height w-full max-w-page items-center gap-3">
                <SiteBrandLink />
                <nav aria-label={t('site.catalogue')} className="hidden md:block">
                    <SiteTabs activeTab={activeTab} params={params} />
                </nav>
                <div className="ml-auto flex items-center gap-1 sm:gap-2">
                    {user ? (
                        <>
                            {can('section.saved') && (
                                <Button component={NavLink} to={PATHS.saved} variant="text">
                                    {t('site.saved')}
                                </Button>
                            )}
                            {can('viewing.book') && (
                                <Button
                                    component={NavLink}
                                    to={PATHS.viewings}
                                    variant="text"
                                    className="hidden sm:inline-flex"
                                >
                                    {t('site.viewings')}
                                </Button>
                            )}
                            {can('viewing.book') && <MessagesLink />}
                            {can('home.manage') && (
                                <Button component={Link} to={PATHS.home} variant="text">
                                    {t('site.dashboard')}
                                </Button>
                            )}
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
