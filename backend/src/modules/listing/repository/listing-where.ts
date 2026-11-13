import { Prisma } from '../../../generated/prisma/client';
import type { ListingCriteria, ManagedListingCriteria } from '../service/filter/listing.criteria';
import { ListingStatus } from '../service/listing-status';
import type { ListingScope } from '../service/listing.types';

/**
 * The text the search box matches — the same expression as `idx_listings_search_trgm`, so the
 * planner can use it. City names are matched on the joined row (six of them).
 */
const SEARCH_TEXT = Prisma.sql`(l.title || ' ' || coalesce(l.neighborhood, '') || ' ' || l.zip)`;

const toDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Search (tenant side) as SQL fragments for the raw query: published listings only, every
 * filter in the query (api.md), each search term typo-tolerant (`<%` is pg_trgm's word
 * similarity, index-backed on the listing text).
 */
export const publishedListingSql = (criteria: ListingCriteria): Prisma.Sql => {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`l.status = ${ListingStatus.PUBLISHED}`,
    Prisma.sql`l.kind = ${criteria.kind}`,
  ];
  if (criteria.citySlug !== undefined) {
    conditions.push(Prisma.sql`c.slug = ${criteria.citySlug}`);
  }
  if (criteria.propertyType !== undefined) {
    conditions.push(Prisma.sql`l.property_type = ${criteria.propertyType}`);
  }
  if (criteria.priceMin !== undefined) {
    conditions.push(Prisma.sql`l.price >= ${criteria.priceMin.toFixed(4)}::numeric`);
  }
  if (criteria.priceMax !== undefined) {
    conditions.push(Prisma.sql`l.price <= ${criteria.priceMax.toFixed(4)}::numeric`);
  }
  if (criteria.bedroomsMin !== undefined) {
    conditions.push(Prisma.sql`l.bedrooms >= ${criteria.bedroomsMin}`);
  }
  if (criteria.bathroomsMin !== undefined) {
    conditions.push(Prisma.sql`l.bathrooms >= ${criteria.bathroomsMin.toFixed(1)}::numeric`);
  }
  if (criteria.petsAllowed !== undefined) {
    conditions.push(Prisma.sql`l.pets_allowed = ${criteria.petsAllowed}`);
  }
  if (criteria.furnished !== undefined) {
    conditions.push(Prisma.sql`l.furnished = ${criteria.furnished}`);
  }
  if (criteria.parking !== undefined) {
    conditions.push(Prisma.sql`l.parking = ${criteria.parking}`);
  }
  if (criteria.availableBy !== undefined) {
    conditions.push(Prisma.sql`l.available_from <= ${toDay(criteria.availableBy)}::date`);
  }
  if (criteria.publishedAfter !== undefined) {
    conditions.push(Prisma.sql`l.published_at > ${criteria.publishedAfter}`);
  }
  for (const term of criteria.searchTerms) {
    conditions.push(Prisma.sql`(${term} <% ${SEARCH_TEXT} OR ${term} <% c.name)`);
  }
  return Prisma.join(conditions, ' AND ');
};

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
