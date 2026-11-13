import { pageableOptions } from '../../../common/dto/pageable';

/** Search: newest first by default; rent both ways (M1 adds the rest of the filters). */
export const LISTING_PAGEABLE = pageableOptions({
  sortable: ['publishedAt', 'rent'] as const,
  defaultSort: 'publishedAt,desc',
});
export type ListingSortField = (typeof LISTING_PAGEABLE.sortable)[number];

/** The owner's dashboard: last changed first. */
export const MANAGED_LISTING_PAGEABLE = pageableOptions({
  sortable: ['updatedAt', 'rent', 'title'] as const,
  defaultSort: 'updatedAt,desc',
});
export type ManagedListingSortField = (typeof MANAGED_LISTING_PAGEABLE.sortable)[number];
