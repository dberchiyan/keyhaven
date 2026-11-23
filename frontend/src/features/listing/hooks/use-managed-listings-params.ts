import { useSearchParams } from 'react-router';
import { z } from 'zod';

import { MAX_URL_PAGE } from '@/shared/lib/paging';

import type { ManagedListParams } from '../types';

const SMALL_PAGE = 10;
const MEDIUM_PAGE = 20;
const LARGE_PAGE = 50;
const SEARCH_MAX_LENGTH = 100;

export const MANAGED_PAGE_SIZES = [SMALL_PAGE, MEDIUM_PAGE, LARGE_PAGE] as const;
const DEFAULT_SIZE = SMALL_PAGE;
const DEFAULT_SORT = 'updatedAt,desc';

export const MANAGED_SORTS = ['updatedAt,desc', 'price,desc', 'price,asc', 'title,asc'] as const;
export const LISTING_STATUSES = ['PUBLISHED', 'DRAFT', 'UNPUBLISHED', 'SUSPENDED'] as const;

const urlSchema = z.object({
    status: z.enum(LISTING_STATUSES).optional().catch(undefined),
    q: z.string().max(SEARCH_MAX_LENGTH).catch(''),
    sort: z.enum(MANAGED_SORTS).catch(DEFAULT_SORT),
    page: z.coerce.number().int().min(1).max(MAX_URL_PAGE).catch(1),
    size: z.coerce
        .number()
        .refine((size) => MANAGED_PAGE_SIZES.some((option) => option === size))
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
    return new URLSearchParams(entries.filter((entry): entry is [string, string] => entry[1] !== undefined));
};

type ListChange = Partial<ManagedListParams>;

export interface UseManagedListingsParamsResult {
    params: ManagedListParams;
    update: (change: ListChange) => void;
}

/**
 * Status, search, sort, page and size live in the URL, parsed with a fallback per field (client
 * state); a change keeps the insights' `?period=` that shares the page.
 */
export const useManagedListingsParams = (): UseManagedListingsParamsResult => {
    const [searchParams, setSearchParams] = useSearchParams();
    const update = (change: ListChange): void => {
        setSearchParams(
            (current) => {
                const next = toSearchParams({ ...parseParams(current), page: 1, ...change });
                const period = current.get('period');
                if (period !== null) {
                    next.set('period', period);
                }
                return next;
            },
            { replace: change.search !== undefined },
        );
    };
    return { params: parseParams(searchParams), update };
};
