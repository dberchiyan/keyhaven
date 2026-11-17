import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';

import { BROWSE_PAGE_SIZE } from '@/shared/lib/listing-search';
import { MAX_URL_PAGE } from '@/shared/lib/paging';

import type { SavedListParams } from '../types';

const urlSchema = z.object({ page: z.coerce.number().int().min(1).max(MAX_URL_PAGE).catch(1) });

export interface UseSavedParamsResult {
    params: SavedListParams;
    setPage: (page: number) => void;
}

/** The saved homes' page lives in the URL (`?page=`) beside the tab, so Back returns to it. */
export const useSavedParams = (): UseSavedParamsResult => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { page } = urlSchema.parse({ page: searchParams.get('page') ?? undefined });
    const setPage = useCallback(
        (next: number): void => {
            setSearchParams((current) => {
                const params = new URLSearchParams(current);
                if (next > 1) {
                    params.set('page', String(next));
                    return params;
                }
                params.delete('page');
                return params;
            });
        },
        [setSearchParams],
    );
    return { params: { page, size: BROWSE_PAGE_SIZE }, setPage };
};
