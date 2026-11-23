import { useSearchParams } from 'react-router';
import { z } from 'zod';

import { SECURITY_CATEGORIES, type SecurityCategory } from '@/features/auth';

const urlSchema = z.object({ category: z.enum(SECURITY_CATEGORIES).optional().catch(undefined) });

export interface SecurityLogParams {
    category: SecurityCategory | undefined;
    setCategory: (category: SecurityCategory | undefined) => void;
}

/** The log's filter lives in the URL (`?category=`), so a reload or a shared link keeps it; "All" stays out of it. */
export const useSecurityLogParams = (): SecurityLogParams => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { category } = urlSchema.parse({ category: searchParams.get('category') ?? undefined });
    return {
        category,
        setCategory: (next) => {
            setSearchParams(
                (current) => {
                    const params = new URLSearchParams(current);
                    if (next) {
                        params.set('category', next);
                        return params;
                    }
                    params.delete('category');
                    return params;
                },
                { replace: true },
            );
        },
    };
};
