import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { BrandMark } from '@/shared/components/brand-mark';
import { PATHS } from '@/shared/lib/paths';

/** Keyhaven mark + wordmark + tagline, linking home (signed-out screens). */
export function BrandLogo(): ReactElement {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center gap-2 text-center">
            <Link to={PATHS.home} aria-label={t('app.home')} className="group flex items-center gap-2 no-underline">
                <BrandMark className="app-hover-lift group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0" />
                <Typography
                    variant="h2"
                    component="span"
                    className="app-hover-fade text-secondary group-hover:text-primary dark:text-text-primary dark:group-hover:text-primary"
                >
                    {t('app.name')}
                </Typography>
            </Link>
            <Typography variant="subtitle1" component="p" color="textSecondary">
                {t('app.tagline')}
            </Typography>
        </div>
    );
}
