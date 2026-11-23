import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useAccess, useCurrentUser } from '@/features/auth';
import { BrandMark } from '@/shared/components/brand-mark';
import { PATHS } from '@/shared/lib/paths';

const BRAND_CLASS = 'flex items-center gap-2 rounded-sm py-1 text-inherit no-underline';

/**
 * The logo goes home, and home depends on who is here (product decision): a visitor gets a full
 * page load of `/`, so nginx serves the landing; a tenant goes to Browse and a lister to the
 * dashboard inside the app.
 */
export function SiteBrandLink(): ReactElement {
    const { t } = useTranslation(['shell', 'common']);
    const { data: user } = useCurrentUser();
    const { canAccess } = useAccess();
    const mark = (
        <>
            <BrandMark className="size-9" />
            <Typography variant="h6" component="span">
                {t('common:app.name')}
            </Typography>
        </>
    );
    if (!user) {
        return (
            <a href={PATHS.home} aria-label={t('shell:site.landing')} className={BRAND_CLASS}>
                {mark}
            </a>
        );
    }
    return (
        <Link
            to={canAccess('home.manage') ? PATHS.home : PATHS.browse}
            aria-label={t('shell:site.home')}
            className={BRAND_CLASS}
        >
            {mark}
        </Link>
    );
}
