import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { BROWSE_PAGE_SIZE } from '@/shared/lib/listingSearch';
import type { SavedListParams } from '../types';

const urlSchema = z.object({ page: z.coerce.number().int().min(1).max(100_000).catch(1) });

/** The saved homes' page lives in the URL (`?page=`), beside the tab. */
export const useSavedParams = (): { params: SavedListParams; setPage: (page: number) => void } => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { page } = urlSchema.parse({ page: searchParams.get('page') ?? undefined });
    const setPage = useCallback(
        (next: number): void => {
            setSearchParams((current) => {
                const params = new URLSearchParams(current);
                if (next > 1) {
                    params.set('page', String(next));
                } else {
                    params.delete('page');
                }
                return params;
            });
        },
        [setSearchParams],
    );
    return { params: { page, size: BROWSE_PAGE_SIZE }, setPage };
};
