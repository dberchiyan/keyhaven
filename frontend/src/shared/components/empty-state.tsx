import Button from '@mui/material/Button';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import type { ComponentType, ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

export interface EmptyStateAction {
    label: string;
    onClick: () => void;
}

export interface EmptyStateProps {
    icon: ComponentType<SvgIconProps>;
    title: string;
    hint?: string;
    action?: EmptyStateAction;
    className?: string;
}

/** The empty branch of an async view (ARCH-35): an icon, what is missing, and a way on when there is one. */
export function EmptyState({ icon: Icon, title, hint, action, className }: EmptyStateProps): ReactElement {
    return (
        <div className={cn('flex flex-col items-center gap-4 px-4 py-12 text-center', className)}>
            <Icon aria-hidden fontSize="large" color="disabled" />
            <Typography variant="h6" component="p">
                {title}
            </Typography>
            {hint && (
                <Typography variant="body2" color="textSecondary">
                    {hint}
                </Typography>
            )}
            {action && (
                <Button variant="outlined" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}
