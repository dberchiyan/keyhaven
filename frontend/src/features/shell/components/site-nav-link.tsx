import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { NavLink } from 'react-router';

import { cn } from '@/shared/lib/cn';

const MAX_COUNT = 99;

export interface SiteNavLinkProps {
    to: string;
    icon: ReactNode;
    label: string;
    count?: number;
    countLabel?: string;
}

/**
 * One of the person's own places in the public header (Saved, Viewings, Messages, Dashboard): the same pill as the
 * catalogue tabs, an icon always and the label from `lg`; below it the label moves into a tooltip and the accessible
 * name (A11Y-7). An unread count sits beside it as a small pill and is part of the name. The tooltip wraps a span:
 * MUI merges its child's `className` as a string and would drop NavLink's active-state function.
 */
export function SiteNavLink({ to, icon, label, count = 0, countLabel }: SiteNavLinkProps): ReactElement {
    const name = count > 0 && countLabel ? countLabel : label;
    return (
        <Tooltip title={label} describeChild classes={{ tooltip: 'lg:hidden' }}>
            <span className="flex">
                <NavLink
                    to={to}
                    aria-label={name}
                    className={({ isActive }) =>
                        cn(
                            'app-hover-fade relative inline-flex min-h-10 items-center gap-2 rounded-full px-3 no-underline hover:bg-action-hover',
                            isActive
                                ? 'bg-badge-active-background text-primary'
                                : 'text-text-secondary hover:text-text-primary',
                        )
                    }
                >
                    <span aria-hidden className="flex">
                        {icon}
                    </span>
                    <Typography variant="subtitle2" component="span" className="hidden lg:inline">
                        {label}
                    </Typography>
                    {count > 0 && (
                        <Typography
                            variant="caption"
                            component="span"
                            aria-hidden
                            className="app-tabular inline-flex min-w-5 justify-center rounded-full bg-secondary px-2 text-secondary-contrast-text"
                        >
                            {count > MAX_COUNT ? `${MAX_COUNT}+` : count}
                        </Typography>
                    )}
                </NavLink>
            </span>
        </Tooltip>
    );
}
