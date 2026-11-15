import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';

export const INBOX_FILTERS = ['all', 'unread'] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

const urlSchema = z.enum(INBOX_FILTERS).catch('all');

/** All or unread conversations — in the URL (data.md → Client state), the default keeps it clean. */
export const useInboxFilter = (): {
  filter: InboxFilter;
  setFilter: (filter: InboxFilter) => void;
} => {
  const [searchParams, setSearchParams] = useSearchParams();
  const setFilter = useCallback(
    (filter: InboxFilter): void => {
      setSearchParams(filter === 'all' ? {} : { filter }, { replace: true });
    },
    [setSearchParams],
  );
  return { filter: urlSchema.parse(searchParams.get('filter') ?? undefined), setFilter };
};
