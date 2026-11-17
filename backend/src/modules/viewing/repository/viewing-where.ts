import type { Prisma } from '../../../generated/prisma/client';
import { ACTIVE_VIEWING_STATUSES } from '../service/viewing-status';
import type { ViewingCriteria, ViewingScope } from '../service/viewing.types';

/** Whose viewings: the scope goes into the query through the listing, never a filter afterwards. */
export const viewingScopeWhere = (scope: ViewingScope): Prisma.ViewingWhereInput => {
    switch (scope.kind) {
        case 'LANDLORD':
            return { listing: { landlordId: scope.landlordId } };
        case 'AGENCY':
            return { listing: { agencyId: scope.agencyId } };
        case 'ALL':
            return {};
    }
};

export const activeViewingWhere: Prisma.ViewingWhereInput = {
    status: { in: [...ACTIVE_VIEWING_STATUSES] },
};

/** "Upcoming" means live rows ahead; a status filter narrows that to one of the two. */
export const managedViewingWhere = (
    scope: ViewingScope,
    criteria: ViewingCriteria,
    now: Date,
): Prisma.ViewingWhereInput => ({
    ...viewingScopeWhere(scope),
    ...(criteria.listingId ? { listingId: criteria.listingId } : {}),
    ...(criteria.upcoming ? { startsAt: { gt: now } } : {}),
    ...(criteria.status ? { status: criteria.status } : criteria.upcoming ? activeViewingWhere : {}),
});
