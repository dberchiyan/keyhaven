import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import type { InsightPoint } from '../types';

/** The plot's height in pixels; the width follows the card (measured, so bars stay crisp). */
const PLOT_HEIGHT = 120;
/** Labels along the bottom: at most this many, evenly spread, never closer than this (px). */
const MAX_DAY_LABELS = 6;
const MIN_LABEL_GAP = 60;

/** The width of an element, kept up to date (a chart drawn in pixels, not a stretched viewBox). */
const useWidth = (ref: React.RefObject<HTMLDivElement | null>): number => {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return undefined;
        }
        setWidth(element.clientWidth);
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setWidth(Math.floor(entry.contentRect.width));
            }
        });
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, [ref]);
    return width;
};

/** The top of the scale: a round number at or above the largest value (1, 2, 5, 10, 20, 50 …). */
const niceCeiling = (max: number): number => {
    if (max <= 1) {
        return 1;
    }
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const candidate = [1, 2, 5, 10].map((step) => step * magnitude).find((value) => value >= max);
    return candidate ?? max;
};

/** Literal class names so Tailwind sees them: the two series differ in tone and in shape (ux.md). */
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
    /** For the day tooltips: "{date}: n views · m saves". */
    tip: (point: InsightPoint) => string;
}

/**
 * One bar per day of the window. Drawn as SVG rectangles in pixel coordinates (the width is
 * measured), with the axis labels in HTML so the typography stays the theme's; the day's
 * figures are the bar's tooltip, and the whole chart is one labelled image for assistive tech
 * — the table beside it carries the same figures (ux.md → charts).
 */
export function InsightBars({ id, title, tone, points, value, tip }: InsightBarsProps) {
    const { t, i18n } = useTranslation('listing');
    const plotRef = useRef<HTMLDivElement>(null);
    const width = useWidth(plotRef);
    const values = points.map(value);
    const max = Math.max(0, ...values);
    const ceiling = niceCeiling(max);
    const total = values.reduce((sum, item) => sum + item, 0);
    const peak = points[values.indexOf(max)];
    const count = points.length;
    const step = count > 0 ? width / count : 0;
    const gap = Math.min(4, Math.max(1, step * 0.25));
    const barWidth = Math.max(1, step - gap);
    const number = new Intl.NumberFormat(i18n.language);
    const dayLabel = new Intl.DateTimeFormat(i18n.language, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
    const labelEvery = Math.max(1, Math.ceil(count / MAX_DAY_LABELS), step > 0 ? Math.ceil(MIN_LABEL_GAP / step) : 1);
    // Counts are whole numbers: the middle line is drawn only where it lands on one.
    const middle = Number.isInteger(ceiling / 2) ? ceiling / 2 : null;
    const labelled = points.filter((_point, index) => index % labelEvery === 0 && index <= count - labelEvery / 2);
    const summary =
        peak && max > 0
            ? t('insights.chartLabel', {
                  title,
                  total: number.format(total),
                  max: number.format(max),
                  peak: dayLabel.format(new Date(`${peak.day}T00:00:00Z`)),
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
                {/* The scale: its top, its middle and zero, lined up with the grid lines. */}
                <div
                    aria-hidden
                    className="flex shrink-0 flex-col justify-between text-right"
                    style={{ height: PLOT_HEIGHT }}
                >
                    <Typography variant="caption" color="textSecondary" className="app-tabular leading-none">
                        {number.format(ceiling)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" className="app-tabular leading-none">
                        {middle === null ? '' : number.format(middle)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" className="app-tabular leading-none">
                        0
                    </Typography>
                </div>
                <div ref={plotRef} className="min-w-0 flex-1">
                    <svg
                        role="img"
                        aria-label={summary}
                        width={width}
                        height={PLOT_HEIGHT}
                        viewBox={`0 0 ${width} ${PLOT_HEIGHT}`}
                        className="block overflow-visible"
                    >
                        {(middle === null ? [0, 1] : [0, 0.5, 1]).map((fraction) => (
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
                            // A quiet day keeps a hairline, so the row of days reads as a row.
                            const height = item > 0 ? Math.max(2, (item / ceiling) * (PLOT_HEIGHT - 2)) : 1;
                            return (
                                <g key={point.day}>
                                    <title>{tip(point)}</title>
                                    <rect
                                        x={index * step + gap / 2}
                                        y={PLOT_HEIGHT - height}
                                        width={barWidth}
                                        height={height}
                                        rx={Math.min(2, barWidth / 2)}
                                        className={item > 0 ? TONES[tone].bar : 'fill-divider'}
                                    />
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
            <div className="flex gap-2">
                <div aria-hidden className="shrink-0 opacity-0">
                    <Typography variant="caption" className="app-tabular">
                        {number.format(ceiling)}
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
                                className={cn(
                                    'absolute top-0 whitespace-nowrap',
                                    index === 0 ? '' : '-translate-x-1/2',
                                )}
                                style={{ left: index === 0 ? 0 : index * step + step / 2 }}
                            >
                                {dayLabel.format(new Date(`${point.day}T00:00:00Z`))}
                            </Typography>
                        );
                    })}
                </div>
            </div>
        </figure>
    );
}
