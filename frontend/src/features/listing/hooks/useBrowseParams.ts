import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import type { BrowseParams } from '../types';

/** Cards per page of the search grid: three rows of four on a wide screen. */
export const BROWSE_PAGE_SIZE = 12;
const DEFAULT_SORT = 'publishedAt,desc';

export const BROWSE_SORTS = ['publishedAt,desc', 'rent,asc', 'rent,desc'] as const;

/** The URL is the source of truth; anything malformed falls back to the default. */
const urlSchema = z.object({
  city: z
    .string()
    .regex(/^[a-z0-9-]{1,100}$/)
    .optional()
    .catch(undefined),
  sort: z.enum(BROWSE_SORTS).catch(DEFAULT_SORT),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
});

const parseParams = (searchParams: URLSearchParams): BrowseParams => {
  const url = urlSchema.parse({
    city: searchParams.get('city') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    page: searchParams.get('page') ?? undefined,
  });
  return { city: url.city, sort: url.sort, page: url.page, size: BROWSE_PAGE_SIZE };
};

const toSearchParams = (params: BrowseParams): URLSearchParams => {
  const entries: [string, string | undefined][] = [
    ['city', params.city],
    ['sort', params.sort === DEFAULT_SORT ? undefined : params.sort],
    ['page', params.page > 1 ? String(params.page) : undefined],
  ];
  return new URLSearchParams(
    entries.filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
};

type BrowseChange = Partial<Omit<BrowseParams, 'size'>>;

/** City, sort and page live in the URL, so a search can be shared and Back works. */
export const useBrowseParams = (): {
  params: BrowseParams;
  update: (change: BrowseChange) => void;
} => {
  const [searchParams, setSearchParams] = useSearchParams();
  const update = useCallback(
    (change: BrowseChange): void => {
      // Any change other than the page itself starts again from page 1.
      setSearchParams((current) => toSearchParams({ ...parseParams(current), page: 1, ...change }));
    },
    [setSearchParams],
  );
  return { params: parseParams(searchParams), update };
};
