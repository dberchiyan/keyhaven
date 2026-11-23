import GitHub from '@mui/icons-material/GitHub';
import MailOutlined from '@mui/icons-material/MailOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/shared/components/brand-mark';

import { GITHUB_URL, README_URL } from '../hooks/use-footer-columns';

const CONTACT_EMAIL = 'hello@keyhaven.example';

type CircleKey = 'github' | 'readme' | 'email';

interface FooterCircle {
    key: CircleKey;
    href: string;
    icon: ReactNode;
}

const CIRCLES: readonly FooterCircle[] = [
    { key: 'github', href: GITHUB_URL, icon: <GitHub fontSize="small" /> },
    { key: 'readme', href: README_URL, icon: <MenuBookOutlined fontSize="small" /> },
    { key: 'email', href: `mailto:${CONTACT_EMAIL}`, icon: <MailOutlined fontSize="small" /> },
];

/** The footer's brand block; the round links are icon-only, so each carries its label (A11Y-7). */
export function FooterBrand(): ReactElement {
    const { t } = useTranslation(['shell', 'common']);
    return (
        <div className="col-span-2 flex max-w-sm flex-col gap-4 md:col-span-1">
            <div className="flex items-center gap-2">
                <BrandMark className="size-9" />
                <Typography variant="h6" component="p">
                    {t('common:app.name')}
                </Typography>
            </div>
            <Typography variant="body2" className="text-footer-muted">
                {t('shell:footer.tagline')}
            </Typography>
            <ul className="m-0 flex list-none gap-2 p-0">
                {CIRCLES.map((circle) => (
                    <li key={circle.key}>
                        <a
                            href={circle.href}
                            aria-label={t(`shell:footer.icons.${circle.key}`)}
                            className="app-hover-fade flex size-11 items-center justify-center rounded-full border border-footer-line bg-footer-tile text-footer-text hover:border-footer-accent hover:text-footer-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-footer-text"
                            {...(circle.href.startsWith('http')
                                ? { target: '_blank', rel: 'noopener noreferrer' }
                                : {})}
                        >
                            {circle.icon}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
