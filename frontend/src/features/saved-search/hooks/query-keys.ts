export const savedSearchKeys = {
    all: ['savedSearches'] as const,
    list: () => [...savedSearchKeys.all, 'list'] as const,
};
