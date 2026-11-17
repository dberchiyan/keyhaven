import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

import type { InsightPoint } from '../types';

export interface InsightBarsDayLabelsProps {
    points: readonly InsightPoint[];
    labelled: readonly InsightPoint[];
    step: number;
    scaleWidthText: string;
    formatDay: (point: InsightPoint) => string;
}

/**
 * Dates under the bars, in HTML so the typography stays the theme's (TYPO-2); an invisible copy of
 * the scale's widest label keeps them aligned with the plot.
 */
export function InsightBarsDayLabels({
    points,
    labelled,
    step,
    scaleWidthText,
    formatDay,
}: InsightBarsDayLabelsProps): ReactElement {
    return (
        <div className="flex gap-2">
            <div aria-hidden className="shrink-0 opacity-0">
                <Typography variant="caption" className="app-tabular">
                    {scaleWidthText}
                </Typography>
            </div>
            <div aria-hidden className="relative h-4 min-w-0 flex-1">
                {labelled.map((point) => {
                    const index = points.indexOf(point);
                    return (
                        <Typography
                            key={point.day}
                            variant="caption"
                            color="textSecondary"
                            component="span"
                            className={cn('absolute top-0 whitespace-nowrap', index === 0 ? '' : '-translate-x-1/2')}
                            style={{ left: index === 0 ? 0 : index * step + step / 2 }}
                        >
                            {formatDay(point)}
                        </Typography>
                    );
                })}
            </div>
        </div>
    );
}
