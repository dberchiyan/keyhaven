import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import {
  type BrowseParams,
  parseBrowseParams,
  toBrowseSearchParams,
} from '@/shared/lib/listingSearch';

export { BROWSE_SORTS } from '@/shared/lib/listingSearch';

type BrowseChange = Partial<Omit<BrowseParams, 'size'>>;

/** Every filter, the sort and the page live in the URL, so a search can be shared and Back works. */
export const useBrowseParams = (): {
  params: BrowseParams;
  update: (change: BrowseChange) => void;
  clear: () => void;
} => {
  const [searchParams, setSearchParams] = useSearchParams();
  const update = useCallback(
    (change: BrowseChange): void => {
      // The change applies over the URL as it is now, not as it was when this render happened:
      // the search box's debounced text may land after a filter changed, and the router's
      // functional updater would still see the older params and drop that filter.
      const current = new URLSearchParams(window.location.search);
      setSearchParams(
        // Any change other than the page itself starts again from page 1.
        toBrowseSearchParams({ ...parseBrowseParams(current), page: 1, ...change }),
        // Typing in the search box replaces the history entry instead of adding one per pause.
        { replace: change.q !== undefined },
      );
    },
    [setSearchParams],
  );
  const clear = useCallback((): void => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);
  return { params: parseBrowseParams(searchParams), update, clear };
};
