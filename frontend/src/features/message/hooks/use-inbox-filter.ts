import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';

export const INBOX_FILTERS = ['all', 'unread'] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

const urlSchema = z.enum(INBOX_FILTERS).catch('all');

export interface UseInboxFilterResult {
    filter: InboxFilter;
    setFilter: (filter: InboxFilter) => void;
}

/** The filter lives in the URL so it survives a reload and a shared link; the default leaves it out. */
export const useInboxFilter = (): UseInboxFilterResult => {
    const [searchParams, setSearchParams] = useSearchParams();
    const setFilter = useCallback(
        (filter: InboxFilter): void => {
            setSearchParams(filter === 'all' ? {} : { filter }, { replace: true });
        },
        [setSearchParams],
    );
    return { filter: urlSchema.parse(searchParams.get('filter') ?? undefined), setFilter };
};
