import type { Actor } from '@/common/security/actor';
import { UserRole } from '@/modules/user/service/user-role';

import type { ListingScope } from './listing.types';

/**
 * SEC-6: the one place the role becomes a query scope, never a filter afterwards. Tenants never reach the
 * dashboard (the policy refuses them); as landlords their scope would be empty anyway.
 */
export const scopeOf = (actor: Actor): ListingScope => {
    if (actor.role === UserRole.ADMIN) {
        return { kind: 'ALL' };
    }
    if (actor.role === UserRole.AGENT && actor.agencyId) {
        return { kind: 'AGENCY', agencyId: actor.agencyId };
    }
    return { kind: 'LANDLORD', landlordId: actor.userId };
};
