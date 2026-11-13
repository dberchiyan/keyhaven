import type { Prisma } from '../../../generated/prisma/client';
import type { ListingCriteria, ManagedListingCriteria } from '../service/filter/listing.criteria';
import { ListingStatus } from '../service/listing-status';
import type { ListingScope } from '../service/listing.types';

/** Search (tenant side): published listings only, by city. */
export const publishedListingWhere = (criteria: ListingCriteria): Prisma.ListingWhereInput => ({
  status: ListingStatus.PUBLISHED,
  ...(criteria.citySlug ? { city: { slug: criteria.citySlug } } : {}),
});

/** Whose listings: the scope goes into the query, never a filter afterwards (api.md). */
export const scopeWhere = (scope: ListingScope): Prisma.ListingWhereInput => {
  switch (scope.kind) {
    case 'LANDLORD':
      return { landlordId: scope.landlordId };
    case 'AGENCY':
      return { agencyId: scope.agencyId };
    case 'ALL':
      return {};
  }
};

export const managedListingWhere = (
  scope: ListingScope,
  criteria: ManagedListingCriteria,
): Prisma.ListingWhereInput => ({
  ...scopeWhere(scope),
  ...(criteria.status ? { status: criteria.status } : {}),
  AND: criteria.searchTerms.map((term) => ({
    OR: [
      { title: { contains: term, mode: 'insensitive' } },
      { city: { name: { contains: term, mode: 'insensitive' } } },
    ],
  })),
});
