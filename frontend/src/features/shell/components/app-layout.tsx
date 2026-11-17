import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactElement, useId, useState, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';

import { IdleSessionWarning, VerificationBanner } from '@/features/auth';
import { TopProgressBar } from '@/shared/components/top-progress-bar';
import { cn } from '@/shared/lib/cn';

import { pageTransitionKey } from '../format';
import { useIsPageLoading } from '../hooks/use-is-page-loading';
import { useSidebarCollapsed } from '../hooks/use-sidebar-collapsed';
import { SidebarContent } from './sidebar-content';
import { TopBar } from './top-bar';

/**
 * The listers' layout (RESP-4): a sidebar foldable to an icon rail on desktop, the rail on a
 * tablet, a drawer from the top bar on a phone; one content width for every page (STY-6).
 */
export function AppLayout(): ReactElement {
    const { t } = useTranslation();
    const theme = useTheme();
    const isTabletUp = useMediaQuery(theme.breakpoints.up('md'));
    const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const sidebar = useSidebarCollapsed();
    const isRail = !isDesktop || sidebar.isCollapsed;
    const menuButtonId = useId();
    const { pathname } = useLocation();
    const isPageLoading = useIsPageLoading();

    const closeDrawer = (): void => {
        setIsDrawerOpen(false);
    };

    return (
        <div className="flex min-h-dvh bg-background">
            <Link
                href="#main"
                className="absolute top-2 left-2 z-50 -translate-y-24 rounded-sm bg-background-paper p-3 focus-visible:translate-y-0"
            >
                {t('a11y.skipToContent')}
            </Link>
            {isTabletUp ? (
                <aside className={cn('sticky top-0 h-dvh shrink-0', isRail ? 'w-rail-width' : 'w-sidebar-width')}>
                    <SidebarContent
                        isCollapsed={isRail}
                        {...(isDesktop ? { onToggleCollapsed: sidebar.toggle } : {})}
                    />
                </aside>
            ) : (
                <Drawer
                    open={isDrawerOpen}
                    onClose={closeDrawer}
                    slotProps={{ paper: { className: 'w-sidebar-width max-w-17/20 border-0' } }}
                >
                    <SidebarContent isCollapsed={false} onNavigate={closeDrawer} />
                </Drawer>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
                <TopBar
                    {...(isTabletUp
                        ? {}
                        : {
                              onOpenMenu: () => {
                                  setIsDrawerOpen(true);
                              },
                          })}
                    menuButtonId={menuButtonId}
                    isMenuOpen={isDrawerOpen}
                />
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
                {isPageLoading && <TopProgressBar />}
                <IdleSessionWarning />
            </div>
        </div>
    );
}
