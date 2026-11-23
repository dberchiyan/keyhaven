import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router';

import { PATHS } from '@/shared/lib/paths';

import type { AccessPart } from '../hooks/use-access';
import { useAccess } from '../hooks/use-access';

export interface RequireAccessProps {
    part: AccessPart;
}

/** Cosmetic route guard: a section the user's role does not use returns to Browse. */
export function RequireAccess({ part }: RequireAccessProps): ReactElement {
    const { canAccess } = useAccess();
    if (canAccess(part)) {
        return <Outlet />;
    }
    return <Navigate to={PATHS.browse} replace />;
}
