/** The caller comes from the session; the cache is cleared on sign-out. */
export const savedSearchKeys = {
    all: ['savedSearches'] as const,
    list: () => [...savedSearchKeys.all, 'list'] as const,
};
