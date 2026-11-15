import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import type { ManagedListParams } from '../types';

export const MANAGED_PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_SIZE = 10;
const DEFAULT_SORT = 'updatedAt,desc';

export const MANAGED_SORTS = ['updatedAt,desc', 'price,desc', 'price,asc', 'title,asc'] as const;
export const LISTING_STATUSES = ['PUBLISHED', 'DRAFT', 'UNPUBLISHED', 'SUSPENDED'] as const;

/** The URL is the source of truth; anything malformed falls back to the default. */
const urlSchema = z.object({
  status: z.enum(LISTING_STATUSES).optional().catch(undefined),
  q: z.string().max(100).catch(''),
  sort: z.enum(MANAGED_SORTS).catch(DEFAULT_SORT),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  size: z.coerce
    .number()
    .refine((size) => (MANAGED_PAGE_SIZES as readonly number[]).includes(size))
    .catch(DEFAULT_SIZE),
});

const parseParams = (searchParams: URLSearchParams): ManagedListParams => {
  const url = urlSchema.parse({
    status: searchParams.get('status') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    size: searchParams.get('size') ?? undefined,
  });
  return { status: url.status, search: url.q, sort: url.sort, page: url.page, size: url.size };
};

const toSearchParams = (params: ManagedListParams): URLSearchParams => {
  const entries: [string, string | undefined][] = [
    ['status', params.status],
    ['q', params.search || undefined],
    ['sort', params.sort === DEFAULT_SORT ? undefined : params.sort],
    ['page', params.page > 1 ? String(params.page) : undefined],
    ['size', params.size === DEFAULT_SIZE ? undefined : String(params.size)],
  ];
  return new URLSearchParams(
    entries.filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
};

type ListChange = Partial<ManagedListParams>;

/** Status, search, sort, page and size live in the URL (data.md → Client state). */
export const useManagedListingsParams = (): {
  params: ManagedListParams;
  update: (change: ListChange) => void;
} => {
  const [searchParams, setSearchParams] = useSearchParams();
  const update = useCallback(
    (change: ListChange): void => {
      setSearchParams(
        (current) => {
          // Any change other than the page itself starts again from page 1.
          const next = toSearchParams({ ...parseParams(current), page: 1, ...change });
          // The insights' period shares the URL (useInsightPeriod) and stays as it was.
          const period = current.get('period');
          if (period !== null) {
            next.set('period', period);
          }
          return next;
        },
        // Typing a search replaces the history entry instead of adding one per pause.
        { replace: change.search !== undefined },
      );
    },
    [setSearchParams],
  );
  return { params: parseParams(searchParams), update };
};
