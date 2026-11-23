import type { Actor } from '@/common/security/actor';
import { UserRole } from '@/modules/user/service/user-role';

import type { Viewing, ViewingAudience, ViewingScope } from './viewing.types';
import { ViewingStatus } from './viewing-status';

/** SEC-6: whose viewings the dashboard lists — the caller's scope goes into the query. */
export const viewingScopeOf = (actor: Actor): ViewingScope => {
    if (actor.role === UserRole.ADMIN) {
        return { kind: 'ALL' };
    }
    if (actor.role === UserRole.AGENT && actor.agencyId) {
        return { kind: 'AGENCY', agencyId: actor.agencyId };
    }
    return { kind: 'LANDLORD', landlordId: actor.userId };
};

/** The tenant's side hides the tenant block and the address until confirmed; everyone else reads as the owner. */
export const viewingAudienceOf = (actor: Actor): ViewingAudience =>
    actor.role === UserRole.TENANT ? 'TENANT' : 'OWNER';

/** The tenant's own view of a viewing: no tenant block, the address only once confirmed. */
export const hideFromTenant = (viewing: Viewing): Viewing => ({
    ...viewing,
    tenant: null,
    listing: {
        ...viewing.listing,
        address: viewing.status === ViewingStatus.CONFIRMED ? viewing.listing.address : null,
    },
});
