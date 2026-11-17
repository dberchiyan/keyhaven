import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useCurrentUser } from '@/features/auth';
import { PATHS, settingsPath } from '@/shared/lib/paths';

import { useFooterColumns } from '../hooks/use-footer-columns';
import { FooterBrand } from './footer-brand';
import { FooterLinkColumn } from './footer-link-column';

const FINE_LINK_CLASS = 'text-footer-text underline-offset-4 hover:underline';
const LANDING_PATHS = { privacy: '/privacy', terms: '/terms' } as const;

/**
 * The public site's footer, mirroring the landing's so both read as one site: a deep forest band
 * in both schemes (by design), the brand block, three link columns, then the fine print. Privacy and Terms
 * are the landing's pages (nginx serves them), so they are plain links — a full navigation, not the router.
 */
export function SiteFooter(): ReactElement {
    const { t } = useTranslation('shell');
    const { data: user } = useCurrentUser();
    const columns = useFooterColumns();
    const year = new Date().getUTCFullYear();

    return (
        <footer className="mt-10 bg-footer-background px-4 text-footer-text md:px-8">
            <div className="mx-auto flex w-full max-w-page flex-col gap-12 pt-14 pb-8">
                <div className="grid grid-cols-2 gap-10 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:justify-between md:gap-x-16 md:gap-y-8">
                    <FooterBrand />
                    {columns.map((column) => (
                        <FooterLinkColumn key={column.key} column={column} />
                    ))}
                </div>
                <div className="flex flex-col gap-2 border-t border-footer-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <Typography variant="body2" className="text-footer-muted">
                        {t('footer.rights', { year })}
                    </Typography>
                    <Typography variant="body2" component="nav" aria-label={t('footer.legal')} className="flex gap-4">
                        <a href={LANDING_PATHS.privacy} className={FINE_LINK_CLASS}>
                            {t('footer.links.privacy')}
                        </a>
                        <a href={LANDING_PATHS.terms} className={FINE_LINK_CLASS}>
                            {t('footer.links.terms')}
                        </a>
                    </Typography>
                    <Typography variant="body2" className="text-footer-muted">
                        {user ? (
                            <Link to={settingsPath('account')} className={FINE_LINK_CLASS}>
                                {t('footer.signedInAs', { name: user.firstName })}
                            </Link>
                        ) : (
                            <Link to={PATHS.login} className={FINE_LINK_CLASS}>
                                {t('footer.signInLink')}
                            </Link>
                        )}
                    </Typography>
                </div>
            </div>
        </footer>
    );
}
