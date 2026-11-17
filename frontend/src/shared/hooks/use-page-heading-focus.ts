import { type RefObject, useEffect, useRef } from 'react';

/** A route change moves focus to the page's <h1>, so screen readers announce the new page (A11Y-3). */
export const usePageHeadingFocus = <T extends HTMLElement>(): RefObject<T | null> => {
    const ref = useRef<T>(null);
    useEffect(() => {
        ref.current?.focus({ preventScroll: true });
    }, []);
    return ref;
};
