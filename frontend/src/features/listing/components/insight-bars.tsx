import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

import { PLOT_HEIGHT, useInsightBarsLayout } from '../hooks/use-insight-bars-layout';
import type { InsightPoint } from '../types';
import { InsightBarsDayLabels } from './insight-bars-day-labels';
import { InsightBarsScale } from './insight-bars-scale';

const GRID_MIDDLE = 0.5;
const MIN_BAR_HEIGHT = 2;

const TONES = {
    views: { bar: 'fill-primary', swatch: 'bg-primary' },
    saves: { bar: 'fill-secondary-dark', swatch: 'bg-secondary-dark' },
} as const;

export interface InsightBarsProps {
    id: string;
    title: string;
    tone: keyof typeof TONES;
    points: readonly InsightPoint[];
    value: (point: InsightPoint) => number;
    tip: (point: InsightPoint) => string;
}

/**
 * One bar per day, hand-drawn (no chart library — PERF-4). The whole chart is one labelled image
 * and the table beside it carries the same figures (A11Y-6/7); the two series differ in tone and
 * in their legend swatch, and a quiet day keeps a hairline so the days still read as a row.
 */
export function InsightBars({ id, title, tone, points, value, tip }: InsightBarsProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const layout = useInsightBarsLayout(points, value);
    const { plotRef, width, values, max, ceiling, middle, total, peak, step, gap, barWidth } = layout;
    const number = new Intl.NumberFormat(i18n.language);
    const dayLabel = new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const formatDay = (point: InsightPoint): string => dayLabel.format(new Date(`${point.day}T00:00:00Z`));
    const summary =
        peak && max > 0
            ? t('insights.chartLabel', {
                  title,
                  total: number.format(total),
                  max: number.format(max),
                  peak: formatDay(peak),
              })
            : t('insights.chartEmpty', { title });

    return (
        <figure aria-labelledby={id} className="m-0 flex flex-col gap-2">
            <figcaption id={id} className="flex items-center gap-2">
                <span aria-hidden className={cn('size-2.5 rounded-sm', TONES[tone].swatch)} />
                <Typography variant="subtitle2" component="span">
                    {title}
                </Typography>
                <Typography variant="caption" color="textSecondary" className="app-tabular ml-auto">
                    {number.format(total)}
                </Typography>
            </figcaption>
            <div className="flex gap-2">
                <InsightBarsScale
                    ceiling={number.format(ceiling)}
                    middle={middle === undefined ? undefined : number.format(middle)}
                />
                <div ref={plotRef} className="min-w-0 flex-1">
                    <svg
                        role="img"
                        aria-label={summary}
                        width={width}
                        height={PLOT_HEIGHT}
                        viewBox={`0 0 ${width} ${PLOT_HEIGHT}`}
                        className="block overflow-visible"
                    >
                        {(middle === undefined ? [0, 1] : [0, GRID_MIDDLE, 1]).map((fraction) => (
                            <line
                                key={fraction}
                                x1={0}
                                x2={width}
                                y1={PLOT_HEIGHT - fraction * (PLOT_HEIGHT - 1)}
                                y2={PLOT_HEIGHT - fraction * (PLOT_HEIGHT - 1)}
                                className="stroke-divider"
                                strokeWidth={1}
                            />
                        ))}
                        {points.map((point, index) => {
                            const item = values[index] ?? 0;
                            const height =
                                item > 0
                                    ? Math.max(MIN_BAR_HEIGHT, (item / ceiling) * (PLOT_HEIGHT - MIN_BAR_HEIGHT))
                                    : 1;
                            return (
                                <g key={point.day}>
                                    <title>{tip(point)}</title>
                                    <rect
                                        x={index * step + gap / 2}
                                        y={PLOT_HEIGHT - height}
                                        width={barWidth}
                                        height={height}
                                        rx={Math.min(MIN_BAR_HEIGHT, barWidth / 2)}
                                        className={item > 0 ? TONES[tone].bar : 'fill-divider'}
                                    />
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
            <InsightBarsDayLabels
                points={points}
                labelled={layout.labelled}
                step={step}
                scaleWidthText={number.format(ceiling)}
                formatDay={formatDay}
            />
        </figure>
    );
}
