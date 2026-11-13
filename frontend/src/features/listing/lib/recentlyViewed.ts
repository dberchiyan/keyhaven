/** Up to this many homes a visitor opened, kept in their browser (the server keeps a person's). */
export const RECENT_LIMIT = 12;
const KEY = 'keyhaven.recentlyViewed';

const UUID = /^[0-9a-f-]{36}$/;

/** Ids, latest first; empty when storage is unavailable (private mode, blocked data). */
export const readRecentlyViewed = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((id): id is string => typeof id === 'string' && UUID.test(id))
          .slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
};

/** Moves (or adds) the id to the front; a failure to store is not an error for the page. */
export const rememberViewed = (listingId: string): void => {
  try {
    const next = [listingId, ...readRecentlyViewed().filter((id) => id !== listingId)].slice(
      0,
      RECENT_LIMIT,
    );
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Per-browser convenience only (data.md → Client state).
  }
};
