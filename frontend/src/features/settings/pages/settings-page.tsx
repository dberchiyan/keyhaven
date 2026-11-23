import Typography from '@mui/material/Typography';
import { type ReactElement, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, NavLink } from 'react-router';

import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { cn } from '@/shared/lib/cn';
import { settingsPath } from '@/shared/lib/paths';
import { trackScrollEdges } from '@/shared/lib/scroll-edges';

import { AccountSection } from '../components/account-section';
import { SecuritySection } from '../components/security-section';
import { SessionsSection } from '../components/sessions-section';
import { SETTINGS_SECTIONS, useSettingsSection } from '../hooks/use-settings-section';

/** Your account, sessions and security log — one section at a time, each with its own URL. */
export function SettingsPage(): ReactElement {
    const { t } = useTranslation('settings');
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    const section = useSettingsSection();
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [section]);
    useDocumentTitle(t('pageTitle'));

    if (section === undefined) {
        return <Navigate to={settingsPath('account')} replace />;
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <Typography ref={headingRef} tabIndex={-1} variant="h4" component="h1" className="outline-none">
                    {t('title')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    {t('subtitle')}
                </Typography>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[var(--spacing-settings-nav)_minmax(0,1fr)]">
                <nav ref={navRef} aria-label={t('menu')}>
                    <ul
                        ref={trackScrollEdges}
                        className="app-scroll-fade app-scroll-quiet m-0 flex list-none gap-2 overflow-x-auto p-0 md:flex-col"
                    >
                        {SETTINGS_SECTIONS.map(({ key, icon: Icon }) => (
                            <li key={key} className="shrink-0">
                                <NavLink
                                    to={settingsPath(key)}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex min-h-11 items-center gap-2 rounded-sm px-3 text-text-secondary no-underline hover:bg-badge-neutral-background',
                                            'outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary',
                                            isActive && 'bg-badge-active-background text-badge-active-text',
                                        )
                                    }
                                >
                                    <Icon aria-hidden fontSize="small" />
                                    <Typography variant="subtitle2" component="span">
                                        {t(`nav.${key}`)}
                                    </Typography>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="min-w-0">
                    {section === 'account' && <AccountSection />}
                    {section === 'sessions' && <SessionsSection />}
                    {section === 'security' && <SecuritySection />}
                </div>
            </div>
        </div>
    );
}
