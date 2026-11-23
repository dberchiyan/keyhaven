import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';

import { PLOT_HEIGHT } from '../hooks/use-insight-bars-layout';

export interface InsightBarsScaleProps {
    ceiling: string;
    middle: string | undefined;
}

/** The scale beside the plot — its top, middle and zero on the gridlines; hidden, the chart's label says it (A11Y-7). */
export function InsightBarsScale({ ceiling, middle }: InsightBarsScaleProps): ReactElement {
    return (
        <div aria-hidden className="flex shrink-0 flex-col justify-between text-right" style={{ height: PLOT_HEIGHT }}>
            <Typography variant="chartTick" color="textSecondary">
                {ceiling}
            </Typography>
            <Typography variant="chartTick" color="textSecondary">
                {middle ?? ''}
            </Typography>
            <Typography variant="chartTick" color="textSecondary">
                0
            </Typography>
        </div>
    );
}
