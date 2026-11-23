import { isUserRole, type UserRole } from '@/modules/user/service/user-role';

import { AccessDeniedException } from '../exception/api.exception';
import type { Principal } from './principal';

/** CORE-25: who acts, as a service sees it — never the session behind it (its id, CSRF hash, client type, flags). */
export interface Actor {
    userId: string;
    role: UserRole;
    agencyId: string | undefined;
}

/**
 * CORE-25: controllers hand services an Actor, never the Principal. A session carries its role's authorities, one role each
 * (`authoritiesFor`), so the role is the authority that names one; a session without one cannot act.
 */
export const toActor = (principal: Principal): Actor => {
    const role = principal.authorities.find(isUserRole);
    if (role === undefined) {
        throw new AccessDeniedException();
    }
    return { userId: principal.userId, role, agencyId: principal.agencyId ?? undefined };
};
