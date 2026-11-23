import { useSearchParams } from 'react-router';
import { z } from 'zod';

import { MAX_URL_PAGE } from '@/shared/lib/paging';

const urlSchema = z.object({ page: z.coerce.number().int().min(0).max(MAX_URL_PAGE).catch(0) });

export interface SessionsParams {
    page: number;
    setPage: (page: number) => void;
}

/** The other sessions' zero-based page lives in the URL (`?page=`); the first page leaves it out. */
export const useSessionsParams = (): SessionsParams => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { page } = urlSchema.parse({ page: searchParams.get('page') ?? undefined });
    return {
        page,
        setPage: (next) => {
            setSearchParams(
                (current) => {
                    const params = new URLSearchParams(current);
                    if (next === 0) {
                        params.delete('page');
                        return params;
                    }
                    params.set('page', String(next));
                    return params;
                },
                { replace: true },
            );
        },
    };
};
