import { type RefObject, type UIEvent, useEffect, useRef, useState } from 'react';

const NEAR_BOTTOM_PX = 80;

export interface UseThreadScrollResult {
    listRef: RefObject<HTMLDivElement | null>;
    behindCount: number;
    onScroll: (event: UIEvent<HTMLDivElement>) => void;
    scrollToEnd: () => void;
}

/**
 * Keeps the newest message in view — unless the reader scrolled up to read older ones: pulling
 * them down would lose their place, so a count of what arrived below is kept for a pill instead.
 * Within 80 px of the end counts as "at the bottom". The effect only measures and scrolls the DOM
 * (ARCH-33); it never fetches.
 */
export const useThreadScroll = (messageCount: number): UseThreadScrollResult => {
    const listRef = useRef<HTMLDivElement>(null);
    const atBottomRef = useRef(true);
    const [behindCount, setBehindCount] = useState(0);
    const [seenCount, setSeenCount] = useState(0);

    useEffect(() => {
        const list = listRef.current;
        if (!list || messageCount === 0) {
            return;
        }
        if (atBottomRef.current || seenCount === 0) {
            list.scrollTop = list.scrollHeight;
            setBehindCount(0);
        } else {
            setBehindCount((value) => value + (messageCount - seenCount));
        }
        setSeenCount(messageCount);
    }, [messageCount, seenCount]);

    const onScroll = (event: UIEvent<HTMLDivElement>): void => {
        const list = event.currentTarget;
        const isAtBottom = list.scrollHeight - list.scrollTop - list.clientHeight <= NEAR_BOTTOM_PX;
        atBottomRef.current = isAtBottom;
        if (isAtBottom && behindCount > 0) {
            setBehindCount(0);
        }
    };

    const scrollToEnd = (): void => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
        setBehindCount(0);
    };

    return { listRef, behindCount, onScroll, scrollToEnd };
};
