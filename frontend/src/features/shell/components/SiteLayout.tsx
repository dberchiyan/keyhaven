import Link from '@mui/material/Link';
import { ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import { IdleSessionWarning, VerificationBanner } from '@/features/auth';
import { TopProgressBar } from '@/shared/components/TopProgressBar';
import { PATHS } from '@/shared/lib/paths';
import { useIsPageLoading } from '../hooks/useIsPageLoading';
import { MobileTabBar } from './MobileTabBar';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** One key per page: Settings' sections (`/settings/<section>`) are one page with its own menu. */
const pageTransitionKey = (pathname: string): string =>
    pathname.startsWith(`${PATHS.settings}/`) ? PATHS.settings : pathname;

/**
 * The public site: the catalogue for visitors and tenants (a header with the Rent / Buy / Houses
 * tabs, no sidebar). People who list homes get the dashboard shell (`AppLayout`) instead.
 */
export function SiteLayout() {
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
            <main id="main" tabIndex={-1} className="flex flex-1 flex-col px-4 py-6 outline-none md:px-8 md:py-8">
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
            {/* The arbitrary padding: room for the phone's bottom bar (its height plus the safe area). */}
            <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden />
            <SiteFooter />
            <MobileTabBar />
            {isPageLoading && <TopProgressBar />}
            <IdleSessionWarning />
        </div>
    );
}
