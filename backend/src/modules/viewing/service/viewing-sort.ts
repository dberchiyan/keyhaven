import { pageableOptions } from '../../../common/dto/pageable';

/** The owner's viewings: soonest first by default; newest request first on demand. */
export const VIEWING_PAGEABLE = pageableOptions({
  sortable: ['startsAt', 'createdAt'] as const,
  defaultSort: 'startsAt,asc',
});
export type ViewingSortField = (typeof VIEWING_PAGEABLE.sortable)[number];
