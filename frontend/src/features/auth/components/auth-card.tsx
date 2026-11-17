import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode, Ref } from 'react';

import { cn } from '@/shared/lib/cn';

import { BrandLogo } from './brand-logo';
import { PageShell } from './page-shell';

export interface AuthCardProps {
    headingRef: Ref<HTMLHeadingElement>;
    title: string;
    subtitle?: string;
    children: ReactNode;
    footer?: ReactNode;
    aside?: ReactNode;
    width?: 'default' | 'wide';
}

/** The signed-out screens' frame: brand, one card, a footer line. */
export function AuthCard({
    headingRef,
    title,
    subtitle,
    children,
    footer,
    aside,
    width = 'default',
}: AuthCardProps): ReactElement {
    return (
        <PageShell className="items-center justify-center px-4 py-8 md:px-8">
            <div className="flex w-full max-w-7xl items-center justify-center gap-12 lg:items-stretch xl:gap-20">
                <div className={cn('flex w-full shrink-0 flex-col gap-8', width === 'wide' ? 'max-w-2xl' : 'max-w-md')}>
                    <BrandLogo />
                    <Card variant="outlined">
                        <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
                            <div className="flex flex-col gap-1">
                                <Typography
                                    ref={headingRef}
                                    tabIndex={-1}
                                    variant="h4"
                                    component="h1"
                                    className="outline-none"
                                >
                                    {title}
                                </Typography>
                                {subtitle && (
                                    <Typography variant="body2" color="textSecondary">
                                        {subtitle}
                                    </Typography>
                                )}
                            </div>
                            {children}
                        </CardContent>
                    </Card>
                    {footer && (
                        <Typography variant="body2" color="textSecondary" className="text-center">
                            {footer}
                        </Typography>
                    )}
                </div>
                {aside}
            </div>
        </PageShell>
    );
}
