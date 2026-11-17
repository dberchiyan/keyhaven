import { type RefObject, useEffect, useRef, useState } from 'react';

import { DECIMAL_RADIX } from '@/shared/lib/units';

import type { InsightPoint } from '../types';

export const PLOT_HEIGHT = 120;
const MAX_DAY_LABELS = 6;
const MIN_LABEL_GAP = 60;
const MAX_BAR_GAP = 4;
const BAR_GAP_SHARE = 0.25;
const HALF_DECADE = 5;
const NICE_STEPS = [1, 2, HALF_DECADE, DECIMAL_RADIX] as const;

export interface InsightBarsLayout {
    plotRef: RefObject<HTMLDivElement | null>;
    width: number;
    values: number[];
    max: number;
    ceiling: number;
    middle: number | undefined;
    total: number;
    peak: InsightPoint | undefined;
    step: number;
    gap: number;
    barWidth: number;
    labelled: InsightPoint[];
}

/** Measured, so the chart is drawn in real pixels and its bars stay crisp instead of a stretched viewBox. */
const useElementWidth = (ref: RefObject<HTMLDivElement | null>): number => {
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

/** A round top for the scale (1, 2, 5, 10, 20 …), so the gridlines read as plain figures. */
const niceCeiling = (max: number): number => {
    if (max <= 1) {
        return 1;
    }
    const magnitude = DECIMAL_RADIX ** Math.floor(Math.log10(max));
    return NICE_STEPS.map((step) => step * magnitude).find((value) => value >= max) ?? max;
};

/**
 * The geometry of the bar chart (ARCH-31: logic in a hook, the chart is markup). Counts are whole
 * numbers, so the middle gridline exists only where it lands on one; day labels are spread so
 * they never crowd, at most six.
 */
export const useInsightBarsLayout = (
    points: readonly InsightPoint[],
    value: (point: InsightPoint) => number,
): InsightBarsLayout => {
    const plotRef = useRef<HTMLDivElement>(null);
    const width = useElementWidth(plotRef);
    const values = points.map(value);
    const max = Math.max(0, ...values);
    const ceiling = niceCeiling(max);
    const count = points.length;
    const step = count > 0 ? width / count : 0;
    const gap = Math.min(MAX_BAR_GAP, Math.max(1, step * BAR_GAP_SHARE));
    const labelEvery = Math.max(1, Math.ceil(count / MAX_DAY_LABELS), step > 0 ? Math.ceil(MIN_LABEL_GAP / step) : 1);
    return {
        plotRef,
        width,
        values,
        max,
        ceiling,
        middle: Number.isInteger(ceiling / 2) ? ceiling / 2 : undefined,
        total: values.reduce((sum, item) => sum + item, 0),
        peak: points[values.indexOf(max)],
        step,
        gap,
        barWidth: Math.max(1, step - gap),
        labelled: points.filter((_point, index) => index % labelEvery === 0 && index <= count - labelEvery / 2),
    };
};
