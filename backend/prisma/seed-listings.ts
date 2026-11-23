import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { ListingKind } from '@/modules/listing/service/listing-kind';
import { ListingStatus } from '@/modules/listing/service/listing-status';
import { PropertyType } from '@/modules/listing/service/property-type';

import { CITIES, type SeedCity } from './seed-data';
import { photoId, photoUrl, RETIRED_PHOTO_HOST } from './seed-listing-photos';
import { ADJECTIVES, describe, type DescribedHome, FEATURES } from './seed-listing-text';
import { pick, random } from './seed-random';

export const LISTING_COUNT = 1000;
export const SALE_LISTING_COUNT = 300;
const SALE_ID_OFFSET = LISTING_COUNT;

const DAY_MS = 86_400_000;
const CREATE_MANY_BATCH_SIZE = 200;

const PROPERTY_TYPES = [
    PropertyType.APARTMENT,
    PropertyType.APARTMENT,
    PropertyType.APARTMENT,
    PropertyType.CONDO,
    PropertyType.HOUSE,
    PropertyType.TOWNHOUSE,
    PropertyType.STUDIO,
] as const;

/** MIG-7: fixed ids, so a re-run skips rows that exist (homes for sale take the ids after the rentals). */
const listingId = (index: number): string => `019a0000-0000-7000-8000-${String(index + 1).padStart(12, '0')}`;

export interface SeedOwners {
    agencyId: string;
    demoLandlordId: string;
    landlordIds: string[];
    agentIds: string[];
}

interface SeedRun {
    roll: () => number;
    owners: SeedOwners;
    today: Date;
    cityIds: ReadonlyMap<string, string>;
}

interface Owner {
    agencyId: string | null;
    landlordId: string | null;
    createdBy: string | null;
}

interface DrawnHome extends DescribedHome {
    cityId: string;
    sizeSqft: number;
    price: number;
    owner: Owner;
    status: ListingStatus;
    publishedAt: Date | null;
    availableOn: Date;
    streetNumber: number;
    unit: string | null;
    photoCount: number;
}

interface Batch {
    rows: Prisma.ListingCreateManyInput[];
    photoRows: Prisma.ListingPhotoCreateManyInput[];
    realigned: { id: string; description: string }[];
}

const bedroomsOf = (roll: () => number, type: PropertyType): number => {
    if (type === PropertyType.STUDIO) {
        return 0;
    }
    return type === PropertyType.HOUSE ? 2 + Math.floor(roll() * 3) : 1 + Math.floor(roll() * 3);
};

/** Rent is rounded to $25, an asking price to $5,000. */
const priceOf = (
    roll: () => number,
    kind: ListingKind,
    city: SeedCity,
    type: PropertyType,
    bedrooms: number,
): number =>
    kind === ListingKind.RENT
        ? Math.round(
              (city.oneBedroomRent *
                  (type === PropertyType.STUDIO ? 0.8 : 0.75 + bedrooms * 0.35) *
                  (0.9 + roll() * 0.3)) /
                  25,
          ) * 25
        : Math.round(
              (city.twoBedroomSalePrice *
                  (type === PropertyType.STUDIO ? 0.55 : 0.6 + bedrooms * 0.2) *
                  (type === PropertyType.HOUSE ? 1.25 : 1) *
                  (0.85 + roll() * 0.4)) /
                  5000,
          ) * 5000;

/** ~38 % of homes belong to the agency, ~1.5 % to the showcase landlord, the rest to the other landlords. */
const ownerOf = (run: SeedRun): Owner => {
    const ownerRoll = run.roll();
    if (ownerRoll < 0.38) {
        return { agencyId: run.owners.agencyId, landlordId: null, createdBy: pick(run.owners.agentIds, run.roll()) };
    }
    if (ownerRoll < 0.395) {
        return { agencyId: null, landlordId: run.owners.demoLandlordId, createdBy: run.owners.demoLandlordId };
    }
    const landlordId = pick(run.owners.landlordIds, run.roll());
    return { agencyId: null, landlordId, createdBy: landlordId };
};

const statusOf = (statusRoll: number): ListingStatus => {
    if (statusRoll < 0.82) {
        return ListingStatus.PUBLISHED;
    }
    if (statusRoll < 0.88) {
        return ListingStatus.DRAFT;
    }
    return statusRoll < 0.96 ? ListingStatus.UNPUBLISHED : ListingStatus.SUSPENDED;
};

const cityIdOf = (run: SeedRun, city: SeedCity): string => {
    const cityId = run.cityIds.get(city.slug);
    if (!cityId) {
        throw new Error(`Seed city not found: ${city.slug}`);
    }
    return cityId;
};

/** The home's shape and price; the rolls run in a fixed order, so the catalogue never changes. */
const drawShape = (
    run: SeedRun,
    kind: ListingKind,
): Pick<DrawnHome, 'kind' | 'city' | 'cityId' | 'type' | 'bedrooms' | 'bathrooms' | 'sizeSqft' | 'price'> => {
    const city = pick(CITIES, run.roll());
    const cityId = cityIdOf(run, city);
    const type = pick(PROPERTY_TYPES, run.roll());
    const bedrooms = bedroomsOf(run.roll, type);
    const bathrooms = bedrooms <= 1 ? 1 : pick([1, 1.5, 2, 2, 2.5], run.roll());
    const sizeSqft = Math.round(
        (type === PropertyType.STUDIO ? 420 : 520 + bedrooms * 260) * (0.85 + run.roll() * 0.4),
    );
    const price = priceOf(run.roll, kind, city, type, bedrooms);
    return { kind, city, cityId, type, bedrooms, bathrooms, sizeSqft, price };
};

/** Every roll of a listing but the three a new row adds (title, street, zip), in the original order. */
const drawHome = (run: SeedRun, kind: ListingKind): DrawnHome => {
    const shape = drawShape(run, kind);
    const neighborhood = pick(shape.city.neighborhoods, run.roll());
    const feature = pick(FEATURES, run.roll());
    const secondFeature = pick(FEATURES, run.roll());
    const isPetFriendly = run.roll() < 0.55;
    const isFurnished = run.roll() < 0.3;
    const hasParking = run.roll() < 0.5;
    const owner = ownerOf(run);
    const status = statusOf(run.roll());
    const publishedDaysAgo = Math.floor(run.roll() * 120);
    const publishedAt =
        status === ListingStatus.DRAFT ? null : new Date(run.today.getTime() - publishedDaysAgo * DAY_MS);
    const availableOn = new Date(run.today.getTime() + Math.floor(run.roll() * 100 - 10) * DAY_MS);
    const streetNumber = 100 + Math.floor(run.roll() * 4800);
    const isHouse = shape.type === PropertyType.HOUSE || shape.type === PropertyType.TOWNHOUSE;
    const unit = isHouse ? null : `Unit ${1 + Math.floor(run.roll() * 40)}${pick(['A', 'B', 'C', ''], run.roll())}`;
    const photoCount = 3 + Math.floor(run.roll() * 4);
    return {
        ...shape,
        neighborhood,
        feature,
        secondFeature,
        isPetFriendly,
        isFurnished,
        hasParking,
        owner,
        status,
        publishedAt,
        availableOn,
        streetNumber,
        unit,
        photoCount,
    };
};

const titleOf = (run: SeedRun, home: DrawnHome): string => {
    const label = home.type === PropertyType.STUDIO ? 'studio' : `${home.bedrooms}-bedroom ${home.type.toLowerCase()}`;
    const suffix = home.kind === ListingKind.SALE ? ' for sale' : '';
    return `${pick(ADJECTIVES, run.roll())} ${label} in ${home.neighborhood}${suffix}`;
};

/** A home for sale has no move-in day (ck_listings_available_on). */
const moveInDayOf = (home: DrawnHome): Date | null =>
    home.kind === ListingKind.RENT
        ? new Date(
              Date.UTC(
                  home.availableOn.getUTCFullYear(),
                  home.availableOn.getUTCMonth(),
                  home.availableOn.getUTCDate(),
              ),
          )
        : null;

const listingRow = (
    run: SeedRun,
    index: number,
    home: DrawnHome,
    description: string,
): Prisma.ListingCreateManyInput => ({
    id: listingId(index),
    landlordId: home.owner.landlordId,
    agencyId: home.owner.agencyId,
    title: titleOf(run, home),
    description,
    propertyType: home.type,
    kind: home.kind,
    price: home.price,
    currency: 'USD',
    bedrooms: home.bedrooms,
    bathrooms: home.bathrooms,
    sizeSqft: home.sizeSqft,
    addressLine1: `${home.streetNumber} ${pick(home.city.streets, run.roll())}`,
    addressLine2: home.unit,
    cityId: home.cityId,
    neighborhood: home.neighborhood,
    zip: `${home.city.zipPrefix}${String(Math.floor(run.roll() * 90) + 10).padStart(2, '0')}`,
    isPetFriendly: home.isPetFriendly,
    isFurnished: home.isFurnished,
    hasParking: home.hasParking,
    availableOn: moveInDayOf(home),
    status: home.status,
    publishedAt: home.publishedAt,
    createdBy: home.owner.createdBy,
    isDemo: true,
});

const photoRowsOf = (index: number, home: DrawnHome): Prisma.ListingPhotoCreateManyInput[] => {
    const isHouse = home.type === PropertyType.HOUSE || home.type === PropertyType.TOWNHOUSE;
    return Array.from({ length: home.photoCount }, (_, photoIndex) => ({
        id: photoId(index, photoIndex),
        listingId: listingId(index),
        url: photoUrl(index, photoIndex, isHouse),
        position: photoIndex,
    }));
};

/** Every roll still happens for a kept row (bar the new row's own), so the catalogue stays the same. */
const addToBatch = (run: SeedRun, batch: Batch, index: number, kind: ListingKind, existing: Set<string>): void => {
    const home = drawHome(run, kind);
    const description = describe(index, home);
    if (existing.has(listingId(index))) {
        batch.realigned.push({ id: listingId(index), description });
        return;
    }
    batch.rows.push(listingRow(run, index, home, description));
    batch.photoRows.push(...photoRowsOf(index, home));
};

/** Kept rows get the current description in one statement (the wording evolves) and become showcase rows. */
const realign = async (prisma: PrismaClient, realigned: Batch['realigned']): Promise<number> => {
    if (realigned.length === 0) {
        return 0;
    }
    const descriptions = await prisma.$executeRaw`
      UPDATE listings AS l SET description = d.description
      FROM unnest(${realigned.map((row) => row.id)}::uuid[], ${realigned.map((row) => row.description)}::text[]) AS d(id, description)
      WHERE l.id = d.id AND l.description <> d.description`;
    await prisma.$executeRaw`
      UPDATE listings SET is_demo = true
      WHERE id = ANY(${realigned.map((row) => row.id)}::uuid[]) AND NOT is_demo`;
    return descriptions;
};

const seedBatch = async (
    prisma: PrismaClient,
    run: SeedRun,
    kind: ListingKind,
    range: { start: number; end: number },
): Promise<{ listings: number; photos: number; descriptions: number }> => {
    const batchIds = Array.from({ length: range.end - range.start }, (_, offset) => listingId(range.start + offset));
    const existing = new Set(
        (await prisma.listing.findMany({ where: { id: { in: batchIds } }, select: { id: true } })).map((row) => row.id),
    );
    const batch: Batch = { rows: [], photoRows: [], realigned: [] };
    for (let index = range.start; index < range.end; index += 1) {
        addToBatch(run, batch, index, kind, existing);
    }
    const descriptions = await realign(prisma, batch.realigned);
    if (batch.rows.length === 0) {
        return { listings: 0, photos: 0, descriptions };
    }
    const created = await prisma.listing.createMany({ data: batch.rows });
    const createdPhotos = await prisma.listingPhoto.createMany({ data: batch.photoRows });
    return { listings: created.count, photos: createdPhotos.count, descriptions };
};

/**
 * ~1,000 homes for rent across the six cities plus homes for sale; returns how many listings (and photos) were added.
 * MIG-7: re-runs leave existing rows alone, photos included — ON CONFLICT cannot arbitrate on the deferrable
 * photo-position unique, so the check happens here. Photos of the retired provider are replaced.
 */
export const seedListings = async (
    prisma: PrismaClient,
    owners: SeedOwners,
    today: Date,
): Promise<{ listings: number; photos: number; descriptions: number; retired: number }> => {
    const cityIds = new Map(
        (await prisma.city.findMany({ select: { id: true, slug: true } })).map((city) => [city.slug, city.id]),
    );
    const run: SeedRun = { roll: random(20261113), owners, today, cityIds };
    const retired = await prisma.listingPhoto.deleteMany({ where: { url: { startsWith: RETIRED_PHOTO_HOST } } });
    const totals = { listings: 0, photos: 0, descriptions: 0 };
    const ranges = [
        { kind: ListingKind.RENT, from: 0, to: LISTING_COUNT },
        { kind: ListingKind.SALE, from: SALE_ID_OFFSET, to: SALE_ID_OFFSET + SALE_LISTING_COUNT },
    ];
    for (const { kind, from, to } of ranges) {
        for (let start = from; start < to; start += CREATE_MANY_BATCH_SIZE) {
            const end = Math.min(start + CREATE_MANY_BATCH_SIZE, to);
            const added = await seedBatch(prisma, run, kind, { start, end });
            totals.listings += added.listings;
            totals.photos += added.photos;
            totals.descriptions += added.descriptions;
        }
    }
    return { ...totals, retired: retired.count };
};
