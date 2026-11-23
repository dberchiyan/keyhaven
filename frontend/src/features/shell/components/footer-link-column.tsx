import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { cn } from '@/shared/lib/cn';

import type { FooterColumn } from '../types';

const LINK_CLASS =
    'inline-flex min-h-9 items-center text-footer-text no-underline app-hover-fade hover:text-footer-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-footer-text';

export interface FooterLinkColumnProps {
    column: FooterColumn;
}

/** A titled column of footer links; outside links open in a new tab with `rel` set (FSEC-3). */
export function FooterLinkColumn({ column }: FooterLinkColumnProps): ReactElement {
    const { t } = useTranslation('shell');
    const headingId = `footer-${column.key}`;
    return (
        <nav aria-labelledby={headingId} className="flex flex-col gap-4">
            <Typography id={headingId} variant="overline" component="h2" className="text-footer-muted">
                {t(`footer.columns.${column.key}`)}
            </Typography>
            <ul
                className={cn('m-0 list-none p-0', column.hasTwoColumns ? 'grid grid-cols-2 gap-x-8' : 'flex flex-col')}
            >
                {column.links.map((item) => (
                    <li key={item.key}>
                        {item.isExternal ? (
                            <a href={item.to} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                                <Typography variant="subtitle2" component="span">
                                    {item.label}
                                </Typography>
                            </a>
                        ) : (
                            <Link to={item.to} className={LINK_CLASS}>
                                <Typography variant="subtitle2" component="span">
                                    {item.label}
                                </Typography>
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
}
