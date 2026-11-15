import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { VIEWINGS_PAGE_SIZE } from '../api/viewingApi';
import { MANAGED_VIEWS, type ManagedView, type ManagedViewingsParams } from '../types';

/** The URL is the source of truth; anything malformed falls back to the default. */
const urlSchema = z.object({
  view: z.enum(MANAGED_VIEWS).catch('requests'),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
});

const parse = (searchParams: URLSearchParams): ManagedViewingsParams => {
  const url = urlSchema.parse({
    view: searchParams.get('view') ?? undefined,
    page: searchParams.get('page') ?? undefined,
  });
  return { view: url.view, page: url.page, size: VIEWINGS_PAGE_SIZE };
};

/** The dashboard's view and page live in the URL (data.md → Client state). */
export const useManagedViewingsParams = (): {
  params: ManagedViewingsParams;
  setView: (view: ManagedView) => void;
  setPage: (page: number) => void;
} => {
  const [searchParams, setSearchParams] = useSearchParams();
  const setView = useCallback(
    (view: ManagedView): void => {
      // A new view starts from its first page; the default view keeps the URL clean.
      setSearchParams(view === 'requests' ? {} : { view });
    },
    [setSearchParams],
  );
  const setPage = useCallback(
    (page: number): void => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (page > 1) {
          next.set('page', String(page));
        } else {
          next.delete('page');
        }
        return next;
      });
    },
    [setSearchParams],
  );
  return { params: parse(searchParams), setView, setPage };
};
