import Link from '@mui/material/Link';
import { type ReactElement, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';

import { IdleSessionWarning, VerificationBanner } from '@/features/auth';
import { TopProgressBar } from '@/shared/components/top-progress-bar';

import { pageTransitionKey } from '../format';
import { useIsPageLoading } from '../hooks/use-is-page-loading';
import { MobileTabBar } from './mobile-tab-bar';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

/**
 * The public site: the catalogue for visitors and tenants (a header with the Rent / Buy / Houses
 * tabs, no sidebar). People who list homes get the dashboard shell (`AppLayout`) instead.
 */
export function SiteLayout(): ReactElement {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const isPageLoading = useIsPageLoading();
    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <Link
                href="#main"
                className="absolute top-2 left-2 z-50 -translate-y-24 rounded-sm bg-background-paper p-3 focus-visible:translate-y-0"
            >
                {t('a11y.skipToContent')}
            </Link>
            <SiteHeader />
            <VerificationBanner />
            <main
                id="main"
                tabIndex={-1}
                className="flex flex-1 flex-col px-4 pt-6 pb-16 outline-none md:px-8 md:pt-8 md:pb-18"
            >
                <div className="mx-auto flex w-full max-w-page flex-1 flex-col">
                    <ViewTransition
                        key={pageTransitionKey(pathname)}
                        enter="page-enter"
                        exit="page-exit"
                        default="none"
                    >
                        <Outlet />
                    </ViewTransition>
                </div>
            </main>
            <div className="box-content h-tab-bar-height pb-[env(safe-area-inset-bottom)] md:hidden" aria-hidden />
            <SiteFooter />
            <MobileTabBar />
            {isPageLoading && <TopProgressBar />}
            <IdleSessionWarning />
        </div>
    );
}
