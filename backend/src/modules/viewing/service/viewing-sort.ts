import { pageableOptions } from '@/common/dto/pageable';

export const VIEWING_PAGEABLE = pageableOptions({
    sortable: ['startsAt', 'createdAt'] as const,
    defaultSort: 'startsAt,asc',
});
export type ViewingSortField = (typeof VIEWING_PAGEABLE.sortable)[number];
