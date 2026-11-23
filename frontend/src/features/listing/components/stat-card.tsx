import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';

import { RevealValue } from './reveal-value';

export interface StatCardProps {
    title: string;
    value: string | undefined;
    hint?: ReactNode;
}

/** A titled number with a hint under it; the hint pairs an icon with words, so colour never carries the meaning alone (A11Y-6). */
export function StatCard({ title, value, hint }: StatCardProps): ReactElement {
    return (
        <Card variant="outlined" className="h-full">
            <CardContent className="flex flex-col gap-2 p-4">
                <Typography variant="subtitle2" component="h2" color="textSecondary">
                    {title}
                </Typography>
                <Typography variant="metric">
                    <RevealValue value={value} fallback={<Skeleton width="3ch" />} />
                </Typography>
                {hint}
            </CardContent>
        </Card>
    );
}
