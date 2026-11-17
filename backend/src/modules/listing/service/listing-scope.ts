import type { Principal } from '@/common/security/principal';
import { UserRole } from '@/modules/user/service/user-role';

import type { ListingScope } from './listing.types';

/**
 * SEC-6: the one place the role becomes a query scope, never a filter afterwards. Tenants never reach the
 * dashboard (the policy refuses them); as landlords their scope would be empty anyway.
 */
export const scopeOf = (principal: Principal): ListingScope => {
    if (principal.hasAuthority(UserRole.ADMIN)) {
        return { kind: 'ALL' };
    }
    if (principal.hasAuthority(UserRole.AGENT) && principal.agencyId) {
        return { kind: 'AGENCY', agencyId: principal.agencyId };
    }
    return { kind: 'LANDLORD', landlordId: principal.userId };
};
