import type { Principal } from '@/common/security/principal';
import { UserRole } from '@/modules/user/service/user-role';

import type { Viewing, ViewingAudience, ViewingScope } from './viewing.types';
import { ViewingStatus } from './viewing-status';

/** SEC-6: whose viewings the dashboard lists — the caller's scope goes into the query. */
export const viewingScopeOf = (principal: Principal): ViewingScope => {
    if (principal.hasAuthority(UserRole.ADMIN)) {
        return { kind: 'ALL' };
    }
    if (principal.hasAuthority(UserRole.AGENT) && principal.agencyId) {
        return { kind: 'AGENCY', agencyId: principal.agencyId };
    }
    return { kind: 'LANDLORD', landlordId: principal.userId };
};

/** The tenant's side hides the tenant block and the address until confirmed; everyone else reads as the owner. */
export const viewingAudienceOf = (principal: Principal): ViewingAudience =>
    principal.hasAuthority(UserRole.TENANT) ? 'TENANT' : 'OWNER';

/** The tenant's own view of a viewing: no tenant block, the address only once confirmed. */
export const hideFromTenant = (viewing: Viewing): Viewing => ({
    ...viewing,
    tenant: null,
    listing: {
        ...viewing.listing,
        address: viewing.status === ViewingStatus.CONFIRMED ? viewing.listing.address : null,
    },
});
