import { z } from 'zod';

/**
 * The search page's filters as the URL and the API name them — shared by the listing feature
 * (the page) and the saved-search feature (a search keeps exactly these). Mirrors the backend's
 * ListingFilterQuerySchema (listing/controller/dto/listing-filter.query.ts).
 */
export const BROWSE_SORTS = ['publishedAt,desc', 'rent,asc', 'rent,desc'] as const;
export type BrowseSort = (typeof BROWSE_SORTS)[number];
export const DEFAULT_BROWSE_SORT: BrowseSort = 'publishedAt,desc';
/** Cards per page of the search grid: three rows of four on a wide screen. */
export const BROWSE_PAGE_SIZE = 12;
export const SEARCH_TEXT_MAX_LENGTH = 100;

const amount = z.string().regex(/^\d{1,9}(\.\d{1,2})?$/);
const flag = z.enum(['true', 'false']).transform((value) => value === 'true');

/** Each field falls back to "not set" when the URL carries nonsense (data.md → Client state). */
const filtersUrlSchema = z.object({
  city: z
    .string()
    .regex(/^[a-z0-9-]{1,100}$/)
    .optional()
    .catch(undefined),
  rentMin: amount.optional().catch(undefined),
  rentMax: amount.optional().catch(undefined),
  beds: z.coerce.number().int().min(0).max(20).optional().catch(undefined),
  baths: z
    .string()
    .regex(/^\d{1,2}(\.5)?$/)
    .optional()
    .catch(undefined),
  pets: flag.optional().catch(undefined),
  furnished: flag.optional().catch(undefined),
  parking: flag.optional().catch(undefined),
  availableBy: z.iso.date().optional().catch(undefined),
  q: z.string().max(SEARCH_TEXT_MAX_LENGTH).optional().catch(undefined),
});

export type SearchFilters = z.output<typeof filtersUrlSchema>;
export const FILTER_KEYS = Object.keys(filtersUrlSchema.shape) as (keyof SearchFilters)[];

export interface BrowseParams extends SearchFilters {
  sort: BrowseSort;
  /** One-based in the URL; the API takes zero-based pages. */
  page: number;
  size: number;
}

const read = (searchParams: URLSearchParams, key: string): string | undefined =>
  searchParams.get(key) ?? undefined;

export const parseBrowseParams = (searchParams: URLSearchParams): BrowseParams => {
  const filters = filtersUrlSchema.parse(
    Object.fromEntries(FILTER_KEYS.map((key) => [key, read(searchParams, key)])),
  );
  const sort = z.enum(BROWSE_SORTS).catch(DEFAULT_BROWSE_SORT).parse(read(searchParams, 'sort'));
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(100_000)
    .catch(1)
    .parse(read(searchParams, 'page'));
  return { ...filters, sort, page, size: BROWSE_PAGE_SIZE };
};

/** Only what differs from the defaults goes into the URL, so links stay short. */
export const toBrowseSearchParams = (params: BrowseParams): URLSearchParams => {
  const entries: [string, string | undefined][] = [
    ...FILTER_KEYS.map((key): [string, string | undefined] => {
      const value = params[key];
      return [key, value === undefined || value === '' ? undefined : String(value)];
    }),
    ['sort', params.sort === DEFAULT_BROWSE_SORT ? undefined : params.sort],
    ['page', params.page > 1 ? String(params.page) : undefined],
  ];
  return new URLSearchParams(
    entries.filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
};

/** The filters alone (what a saved search keeps), without sort and page. */
export const filtersOf = (params: BrowseParams): SearchFilters =>
  Object.fromEntries(
    FILTER_KEYS.flatMap((key) => (params[key] === undefined ? [] : [[key, params[key]]])),
  );

export const hasFilters = (filters: SearchFilters): boolean =>
  FILTER_KEYS.some((key) => filters[key] !== undefined);

/** `/browse?…` for a set of filters — a saved search opens its results here. */
export const browseSearch = (filters: SearchFilters): string =>
  toBrowseSearchParams({
    ...filters,
    sort: DEFAULT_BROWSE_SORT,
    page: 1,
    size: BROWSE_PAGE_SIZE,
  }).toString();
