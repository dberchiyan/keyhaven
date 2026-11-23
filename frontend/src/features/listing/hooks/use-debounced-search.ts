import { useEffect, useEffectEvent, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

export interface DebouncedSearch {
    search: string;
    setSearch: (search: string) => void;
}

/**
 * The search box's text, sent on after a typing pause so each keystroke is not a URL change and a
 * request. When the URL changes from outside (back/forward, "clear filters") the box shows what
 * it says — adjusted during render, not synced in an effect (ARCH-32). The caller's `onCommit` is read as an
 * effect event, so a new function from a re-render does not restart the pause.
 */
export const useDebouncedSearch = (urlSearch: string, onCommit: (search: string) => void): DebouncedSearch => {
    const [search, setSearch] = useState(urlSearch);
    const [seenUrlSearch, setSeenUrlSearch] = useState(urlSearch);
    if (urlSearch !== seenUrlSearch) {
        setSeenUrlSearch(urlSearch);
        setSearch(urlSearch);
    }
    const commit = useEffectEvent(onCommit);
    useEffect(() => {
        if (search === urlSearch) {
            return undefined;
        }
        const timer = setTimeout(() => {
            commit(search);
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
        };
    }, [search, urlSearch]);
    return { search, setSearch };
};
