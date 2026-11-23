import { useSearchParams } from 'react-router';
import { z } from 'zod';

import { MAX_URL_PAGE } from '@/shared/lib/paging';

import { VIEWINGS_PAGE_SIZE } from '../api/viewing-api';
import { MANAGED_VIEWS, type ManagedView, type ManagedViewingsParams } from '../types';

const urlSchema = z.object({
    view: z.enum(MANAGED_VIEWS).catch('requests'),
    page: z.coerce.number().int().min(1).max(MAX_URL_PAGE).catch(1),
});

const parse = (searchParams: URLSearchParams): ManagedViewingsParams => {
    const url = urlSchema.parse({
        view: searchParams.get('view') ?? undefined,
        page: searchParams.get('page') ?? undefined,
    });
    return { view: url.view, page: url.page, size: VIEWINGS_PAGE_SIZE };
};

export interface UseManagedViewingsParamsResult {
    params: ManagedViewingsParams;
    setView: (view: ManagedView) => void;
    setPage: (page: number) => void;
}

/**
 * The dashboard's view and page live in the URL, malformed values falling back to the defaults; a
 * new view starts on its first page and the default view keeps the URL clean.
 */
export const useManagedViewingsParams = (): UseManagedViewingsParamsResult => {
    const [searchParams, setSearchParams] = useSearchParams();
    const setView = (view: ManagedView): void => {
        setSearchParams(view === 'requests' ? {} : { view });
    };
    const setPage = (page: number): void => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (page > 1) {
                next.set('page', String(page));
            } else {
                next.delete('page');
            }
            return next;
        });
    };
    return { params: parse(searchParams), setView, setPage };
};
