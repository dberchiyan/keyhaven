import { type RefCallback, useCallback, useEffect, useRef, useState } from 'react';

import { trackScrollEdges } from '@/shared/lib/scroll-edges';

const SUBPIXEL_SLACK = 1;
const PAGE_SHARE = 0.8;

export interface StripEdges {
    hasMoreStart: boolean;
    hasMoreEnd: boolean;
}

export interface StripScroll {
    edges: StripEdges;
    attach: RefCallback<HTMLUListElement>;
    measure: (element: HTMLUListElement) => void;
    scrollBy: (direction: -1 | 1) => void;
}

/**
 * Which ends of a sideways row still hide cards, for the arrows (ARCH-31). Sub-pixel widths leave
 * a fraction "to scroll", hence the slack; state changes only when an edge flips, because the
 * measure runs on every scroll event. An arrow moves most of a view, so the last card seen stays
 * as a landmark.
 */
export const useStripScroll = (itemCount: number): StripScroll => {
    const listRef = useRef<HTMLUListElement>(null);
    const [edges, setEdges] = useState<StripEdges>({ hasMoreStart: false, hasMoreEnd: false });
    const measure = (element: HTMLUListElement): void => {
        const next = {
            hasMoreStart: element.scrollLeft > SUBPIXEL_SLACK,
            hasMoreEnd: element.scrollLeft + element.clientWidth < element.scrollWidth - SUBPIXEL_SLACK,
        };
        setEdges((previous) =>
            previous.hasMoreStart === next.hasMoreStart && previous.hasMoreEnd === next.hasMoreEnd ? previous : next,
        );
    };
    useEffect(() => {
        const element = listRef.current;
        if (!element) {
            return undefined;
        }
        measure(element);
        const observer = new ResizeObserver(() => {
            measure(element);
        });
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, [itemCount]);
    const attach = useCallback((element: HTMLUListElement | null) => {
        listRef.current = element;
        return trackScrollEdges(element);
    }, []);
    const scrollBy = (direction: -1 | 1): void => {
        const element = listRef.current;
        element?.scrollBy({ left: direction * element.clientWidth * PAGE_SHARE, behavior: 'smooth' });
    };
    return { edges, attach, measure, scrollBy };
};
