import { type RefObject, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

const FIRST_LOCATION_KEY = 'default';

/**
 * After an in-app navigation, focus moves to the page's <h1> so screen readers announce the new page (A11Y-3).
 * The document's first page (the router's `default` location) keeps the browser's focus, so the first Tab
 * reaches "Skip to content" (ARCH-36, A11Y-2).
 */
export const usePageHeadingFocus = <T extends HTMLElement>(): RefObject<T | null> => {
    const ref = useRef<T>(null);
    const isFirstPage = useLocation().key === FIRST_LOCATION_KEY;
    useEffect(() => {
        if (!isFirstPage) {
            ref.current?.focus({ preventScroll: true });
        }
    }, [isFirstPage]);
    return ref;
};
