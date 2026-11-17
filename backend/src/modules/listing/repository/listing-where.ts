import { MONEY_SCALE } from '@/common/persistence/money';
import { toUtcDay } from '@/common/time/utc-day';
import { Prisma } from '@/generated/prisma/client';

import type { ListingCriteria, ManagedListingCriteria } from '../service/filter/listing.criteria';
import type { InsightTarget, ListingScope } from '../service/listing.types';
import { ListingStatus } from '../service/listing-status';

const INDEXED_SEARCH_TEXT = Prisma.sql`(l.title || ' ' || coalesce(l.neighborhood, '') || ' ' || l.zip)`;

/**
 * SEC-6: published listings only, every filter in the query. Each term is typo-tolerant (`<%` is pg_trgm's word
 * similarity) against the same expression as `idx_listings_search_trgm`, so the planner can use the index; city
 * names are matched on the joined row (a handful of them).
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
        conditions.push(Prisma.sql`l.price >= ${criteria.priceMin.toFixed(MONEY_SCALE)}::numeric`);
    }
    if (criteria.priceMax !== undefined) {
        conditions.push(Prisma.sql`l.price <= ${criteria.priceMax.toFixed(MONEY_SCALE)}::numeric`);
    }
    if (criteria.bedroomsMin !== undefined) {
        conditions.push(Prisma.sql`l.bedrooms >= ${criteria.bedroomsMin}`);
    }
    if (criteria.bathroomsMin !== undefined) {
        conditions.push(Prisma.sql`l.bathrooms >= ${criteria.bathroomsMin.toFixed(1)}::numeric`);
    }
    if (criteria.isPetFriendly !== undefined) {
        conditions.push(Prisma.sql`l.is_pet_friendly = ${criteria.isPetFriendly}`);
    }
    if (criteria.isFurnished !== undefined) {
        conditions.push(Prisma.sql`l.is_furnished = ${criteria.isFurnished}`);
    }
    if (criteria.hasParking !== undefined) {
        conditions.push(Prisma.sql`l.has_parking = ${criteria.hasParking}`);
    }
    if (criteria.moveInAt !== undefined) {
        conditions.push(Prisma.sql`l.available_at <= ${toUtcDay(criteria.moveInAt)}::date`);
    }
    if (criteria.publishedAfter !== undefined) {
        conditions.push(Prisma.sql`l.published_at > ${criteria.publishedAfter}`);
    }
    for (const term of criteria.searchTerms) {
        conditions.push(Prisma.sql`(${term} <% ${INDEXED_SEARCH_TEXT} OR ${term} <% c.name)`);
    }
    return Prisma.join(conditions, ' AND ');
};

/** SEC-6: the scope goes into the query, never a filter afterwards. */
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

export const insightTargetSql = (target: InsightTarget): Prisma.Sql => {
    switch (target.kind) {
        case 'LANDLORD':
            return Prisma.sql`l.landlord_id = ${target.landlordId}::uuid`;
        case 'AGENCY':
            return Prisma.sql`l.agency_id = ${target.agencyId}::uuid`;
        case 'LISTING':
            return Prisma.sql`l.id = ${target.listingId}::uuid`;
        case 'ALL':
            return Prisma.sql`TRUE`;
    }
};
