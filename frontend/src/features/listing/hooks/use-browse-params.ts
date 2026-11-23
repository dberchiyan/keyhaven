import { useSearchParams } from 'react-router';

import { type BrowseParams, parseBrowseParams, toBrowseSearchParams } from '@/shared/lib/listing-search';

type BrowseChange = Partial<Omit<BrowseParams, 'size'>>;

export interface UseBrowseParamsResult {
    params: BrowseParams;
    update: (change: BrowseChange) => void;
    clear: () => void;
}

/**
 * Every filter, the sort and the page live in the URL, so a search can be shared and Back works.
 * A change builds on `window.location.search`, not the router's updater: a debounced change that
 * lands after a filter click would otherwise see the older params and drop the filter.
 */
export const useBrowseParams = (): UseBrowseParamsResult => {
    const [searchParams, setSearchParams] = useSearchParams();
    const update = (change: BrowseChange): void => {
        const current = new URLSearchParams(window.location.search);
        setSearchParams(toBrowseSearchParams({ ...parseBrowseParams(current), page: 1, ...change }), {
            replace: change.q !== undefined,
        });
    };
    const clear = (): void => {
        setSearchParams(new URLSearchParams());
    };
    return { params: parseBrowseParams(searchParams), update, clear };
};
