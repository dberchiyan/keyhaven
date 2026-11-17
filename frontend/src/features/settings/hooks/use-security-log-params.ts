import { useSearchParams } from 'react-router';

import { isSecurityCategory, type SecurityCategory } from '@/features/auth';

export interface SecurityLogParams {
    category: SecurityCategory | undefined;
    setCategory: (category: SecurityCategory | undefined) => void;
}

/** The log's filter lives in the URL (`?category=`), so a reload or a shared link keeps it; "All" stays out of it. */
export const useSecurityLogParams = (): SecurityLogParams => {
    const [searchParams, setSearchParams] = useSearchParams();
    const raw = searchParams.get('category');
    return {
        category: isSecurityCategory(raw) ? raw : undefined,
        setCategory: (category) => {
            setSearchParams(
                (current) => {
                    const params = new URLSearchParams(current);
                    if (category) {
                        params.set('category', category);
                    } else {
                        params.delete('category');
                    }
                    params.delete('logPage');
                    return params;
                },
                { replace: true },
            );
        },
    };
};
