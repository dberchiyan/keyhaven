import { MONEY_SCALE } from '@/common/persistence/money';
import { toUtcDay } from '@/common/time/utc-day';
import { Prisma } from '@/generated/prisma/client';

import type { ListingCriteria, ManagedListingCriteria } from '../service/filter/listing.criteria';
import type { InsightTarget, ListingScope } from '../service/listing.types';
import { ListingStatus } from '../service/listing-status';

const INDEXED_SEARCH_TEXT = Prisma.sql`(l.title || ' ' || coalesce(l.neighborhood, '') || ' ' || l.zip)`;

const whenSet = <T>(value: T | undefined, toSql: (value: T) => Prisma.Sql): Prisma.Sql[] =>
    value === undefined ? [] : [toSql(value)];

const rangeConditions = (criteria: ListingCriteria): Prisma.Sql[] => [
    ...whenSet(criteria.priceMin, (min) => Prisma.sql`l.price >= ${min.toFixed(MONEY_SCALE)}::numeric`),
    ...whenSet(criteria.priceMax, (max) => Prisma.sql`l.price <= ${max.toFixed(MONEY_SCALE)}::numeric`),
    ...whenSet(criteria.bedroomsMin, (min) => Prisma.sql`l.bedrooms >= ${min}`),
    ...whenSet(criteria.bathroomsMin, (min) => Prisma.sql`l.bathrooms >= ${min.toFixed(1)}::numeric`),
    ...whenSet(criteria.moveInOn, (day) => Prisma.sql`l.available_on <= ${toUtcDay(day)}::date`),
    ...whenSet(criteria.publishedAfter, (instant) => Prisma.sql`l.published_at > ${instant}`),
];

const featureConditions = (criteria: ListingCriteria): Prisma.Sql[] => [
    ...whenSet(criteria.citySlug, (slug) => Prisma.sql`c.slug = ${slug}`),
    ...whenSet(criteria.propertyType, (type) => Prisma.sql`l.property_type = ${type}`),
    ...whenSet(criteria.isPetFriendly, (value) => Prisma.sql`l.is_pet_friendly = ${value}`),
    ...whenSet(criteria.isFurnished, (value) => Prisma.sql`l.is_furnished = ${value}`),
    ...whenSet(criteria.hasParking, (value) => Prisma.sql`l.has_parking = ${value}`),
];

/**
 * SEC-6: published listings only, every filter in the query. Each term is typo-tolerant (`<%` is pg_trgm's word
 * similarity) against the same expression as `idx_listings_title_neighborhood_zip`, so the planner can use the
 * index; city names are matched on the joined row (a handful of them).
 */
export const publishedListingSql = (criteria: ListingCriteria): Prisma.Sql =>
    Prisma.join(
        [
            Prisma.sql`l.status = ${ListingStatus.PUBLISHED}`,
            Prisma.sql`l.kind = ${criteria.kind}`,
            ...featureConditions(criteria),
            ...rangeConditions(criteria),
            ...criteria.searchTerms.map((term) => Prisma.sql`(${term} <% ${INDEXED_SEARCH_TEXT} OR ${term} <% c.name)`),
        ],
        ' AND ',
    );

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
