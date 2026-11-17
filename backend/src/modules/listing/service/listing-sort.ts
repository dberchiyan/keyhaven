import { pageableOptions } from '@/common/dto/pageable';

export const LISTING_PAGEABLE = pageableOptions({
    sortable: ['publishedAt', 'price'] as const,
    defaultSort: 'publishedAt,desc',
});
export type ListingSortField = (typeof LISTING_PAGEABLE.sortable)[number];

export const MANAGED_LISTING_PAGEABLE = pageableOptions({
    sortable: ['updatedAt', 'price', 'title'] as const,
    defaultSort: 'updatedAt,desc',
});
export type ManagedListingSortField = (typeof MANAGED_LISTING_PAGEABLE.sortable)[number];

export const SAVED_LISTING_PAGEABLE = pageableOptions({
    sortable: ['savedAt'] as const,
    defaultSort: 'savedAt,desc',
});
export type SavedListingSortField = (typeof SAVED_LISTING_PAGEABLE.sortable)[number];
