import { useEffect, useState } from 'react';

const RECENT_LIMIT = 12;
const KEY = 'keyhaven.recentlyViewed';

const UUID = /^[0-9a-f-]{36}$/;

/** Ids, latest first; empty when storage is unavailable (private mode, blocked data). */
const readRecentlyViewed = (): string[] => {
    try {
        const raw = localStorage.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter((id): id is string => typeof id === 'string' && UUID.test(id)).slice(0, RECENT_LIMIT)
            : [];
    } catch {
        return [];
    }
};

/** Moves (or adds) the id to the front; a failure to store is not an error for the page. */
const rememberViewed = (listingId: string): void => {
    try {
        const next = [listingId, ...readRecentlyViewed().filter((id) => id !== listingId)].slice(0, RECENT_LIMIT);
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        return;
    }
};

/**
 * A visitor's recently viewed homes live in this browser only (localStorage, ids only — FSEC-4);
 * read once per mount, so the strip does not reorder under the reader.
 */
export const useLocalRecentlyViewed = (): string[] => {
    const [ids] = useState(readRecentlyViewed);
    return ids;
};

/** Remembers an opened home in this browser — storage, not server data, so an effect is right (ARCH-5). */
export const useRememberViewed = (listingId: string | undefined): void => {
    useEffect(() => {
        if (listingId !== undefined) {
            rememberViewed(listingId);
        }
    }, [listingId]);
};
