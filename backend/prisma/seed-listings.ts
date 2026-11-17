import type { PrismaClient } from '@/generated/prisma/client';
import { ListingKind } from '@/modules/listing/service/listing-kind';
import { ListingStatus } from '@/modules/listing/service/listing-status';
import { PropertyType } from '@/modules/listing/service/property-type';

import { CITIES, type SeedCity } from './seed-data';

export const LISTING_COUNT = 1000;
export const SALE_LISTING_COUNT = 300;
const SALE_ID_OFFSET = LISTING_COUNT;

const DAY_MS = 86_400_000;
const CREATE_MANY_BATCH_SIZE = 200;

/** A small deterministic PRNG (mulberry32), so every run generates the same catalogue. */
const random = (seed: number): (() => number) => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const pick = <T>(items: readonly T[], roll: number): T => {
    const item = items[Math.floor(roll * items.length)];
    if (item === undefined) {
        throw new Error('pick from an empty list');
    }
    return item;
};

/** MIG-7: fixed ids, so a re-run skips rows that exist (homes for sale take the ids after the rentals). */
const listingId = (index: number): string => `019a0000-0000-7000-8000-${String(index + 1).padStart(12, '0')}`;
const photoId = (listingIndex: number, photoIndex: number): string =>
    `019a0000-0000-7000-8001-${String(listingIndex + 1).padStart(8, '0')}${String(photoIndex).padStart(4, '0')}`;

/**
 * Photos: a fixed pool of Unsplash images (served by Unsplash's CDN, Unsplash licence) of homes
 * and rooms, until the uploads module (M1) stores real photos in R2 — a project decision.
 * Exteriors come first on a house's gallery; every listing gets rooms from the interior pool.
 */
const UNSPLASH = (id: string): string =>
    `https://images.unsplash.com/photo-${id}?w=1200&h=800&q=70&auto=format&fit=crop`;
const EXTERIOR_PHOTOS = [
    '1512917774080-9991f1c4c750',
    '1568605114967-8130f3a36994',
    '1570129477492-45c003edd2be',
    '1600596542815-ffad4c1539a9',
    '1600585154340-be6161a56a0c',
    '1600566753190-17f0baa2a6c3',
    '1564013799919-ab600027ffc6',
    '1580587771525-78b9dba3b914',
    '1583608205776-bfd35f0d9f83',
    '1523217582562-09d0def993a6',
    '1449844908441-8829872d2607',
].map(UNSPLASH);
const INTERIOR_PHOTOS = [
    '1502672260266-1c1ef2d93688',
    '1522708323590-d24dbb6b0267',
    '1493809842364-78817add7ffb',
    '1484154218962-a197022b5858',
    '1556228453-efd6c1ff04f6',
    '1560448204-e02f11c3d0e2',
    '1502005229762-cf1b2da7c5d6',
    '1600607687939-ce8a6c25118c',
    '1586023492125-27b2c045efd7',
    '1554995207-c18c203602cb',
    '1565182999561-18d7dc61c393',
    '1556911220-bff31c812dba',
    '1540518614846-7eded433c457',
    '1505693416388-ac5ce068fe85',
    '1616594039964-ae9021a400a0',
    '1552321554-5fefe8c9ef14',
    '1507652313519-d4e9174996dd',
    '1484101403633-562f891dc89a',
    '1598928506311-c55ded91a20c',
    '1536376072261-38c75010e6c9',
    '1588854337115-1c67d9247e4d',
    '1595526114035-0d45ed16cfbf',
    '1524758631624-e2822e304c36',
    '1513694203232-719a280e022f',
    '1567767292278-a4f21aa2d36e',
].map(UNSPLASH);
const RETIRED_PHOTO_HOST = 'https://loremflickr.com/';

/** Consecutive rooms differ: the interior pool is walked from a per-listing offset. */
const photoUrl = (listingIndex: number, photoIndex: number, isHouse: boolean): string => {
    if (isHouse && photoIndex === 0) {
        return pick(EXTERIOR_PHOTOS, ((listingIndex * 7) % 97) / 97);
    }
    const offset = (listingIndex * 11) % INTERIOR_PHOTOS.length;
    return pick(INTERIOR_PHOTOS, ((offset + photoIndex * 3) % INTERIOR_PHOTOS.length) / INTERIOR_PHOTOS.length);
};

const PROPERTY_TYPES = [
    PropertyType.APARTMENT,
    PropertyType.APARTMENT,
    PropertyType.APARTMENT,
    PropertyType.CONDO,
    PropertyType.HOUSE,
    PropertyType.TOWNHOUSE,
    PropertyType.STUDIO,
] as const;

const ADJECTIVES = [
    'Sunny',
    'Quiet',
    'Renovated',
    'Bright',
    'Spacious',
    'Cozy',
    'Modern',
    'Charming',
    'Airy',
    'Updated',
];
const FEATURES = [
    'hardwood floors',
    'a private balcony',
    'in-unit laundry',
    'a walk-in closet',
    'floor-to-ceiling windows',
    'a renovated kitchen',
    'a fenced yard',
    'central air',
    'a rooftop deck',
    'bike storage',
];

const LIGHT = [
    'Morning light fills the main room, and the bedrooms face the quiet side of the building.',
    'High ceilings and an open plan make the space feel larger than its footprint.',
    'A long, bright living area opens onto the kitchen; the bathroom was redone last year.',
    'Every room has a window, and the storage is unusually generous for the size.',
];
const AREA = [
    '{n} is a walkable part of {c}: cafés, a weekly market and a park within a few blocks.',
    'Transit is close — a short ride to downtown {c} and an easy drive to the highway.',
    'Groceries, a pharmacy and a gym are on the same street, with a library and schools nearby.',
    'Quiet, tree-lined blocks, with restaurants and nightlife a ten-minute walk away.',
];
const RENT_TERMS = [
    'Twelve-month lease; the first month and a deposit are due at signing.',
    'Twelve-month lease, with a shorter term possible on request; utilities are billed separately.',
    'Available on a twelve-month lease; a deposit equal to one month is held in escrow.',
];
const SALE_TERMS = [
    'Sold by the owners after many years in the home; most appliances stay.',
    'A well-kept building with low monthly dues; the roof and the boiler were replaced recently.',
    'Priced for a quick sale; viewings any day of the week by appointment.',
];
const at = <T>(items: readonly T[], index: number): T => {
    const item = items[index % items.length];
    if (item === undefined) {
        throw new Error('pick from an empty list');
    }
    return item;
};

/**
 * Two or three paragraphs — the home, the area, the terms — from the row's own attributes, picked by the listing's
 * index so a re-run writes the same text; every third listing folds the area into the first paragraph.
 */
const describe = (
    index: number,
    kind: ListingKind,
    type: PropertyType,
    bedrooms: number,
    bathrooms: number,
    city: SeedCity,
    neighborhood: string,
    feature: string,
    secondFeature: string,
    isPetFriendly: boolean,
    isFurnished: boolean,
    hasParking: boolean,
): string => {
    const home =
        type === PropertyType.STUDIO ? 'studio' : `${bedrooms}-bedroom, ${bathrooms}-bath ${type.toLowerCase()}`;
    const intro = `A ${home} in ${neighborhood}, ${city.name}, with ${feature} and ${secondFeature}. ${at(LIGHT, index)}`;
    const area = at(AREA, index >> 2)
        .replaceAll('{n}', neighborhood)
        .replaceAll('{c}', city.name);
    const terms =
        kind === ListingKind.RENT
            ? [
                  isPetFriendly ? 'Pets are welcome.' : 'No pets, please.',
                  isFurnished ? 'Comes fully furnished.' : 'Unfurnished — bring your own style.',
                  hasParking ? 'One parking spot is included.' : 'Street parking nearby.',
                  at(RENT_TERMS, index),
              ].join(' ')
            : [
                  hasParking ? 'One parking spot comes with the home.' : 'Street parking only.',
                  at(SALE_TERMS, index),
              ].join(' ');
    return index % 3 === 0 ? `${intro} ${area}\n\n${terms}` : `${intro}\n\n${area}\n\n${terms}`;
};

export interface SeedOwners {
    agencyId: string;
    demoLandlordId: string;
    landlordIds: string[];
    agentIds: string[];
}

/**
 * ~1,000 homes for rent across the six cities plus homes for sale; returns how many listings (and photos) were added.
 * MIG-7: re-runs leave existing rows alone, photos included — ON CONFLICT cannot arbitrate on the deferrable
 * photo-position unique, so the check happens here, and every roll() still happens for a skipped row, so the
 * catalogue stays the same. Kept rows get the current description in one statement per batch (the wording evolves,
 * the attributes never do) and become showcase rows; photos of the retired provider are replaced. Rent is rounded
 * to $25, an asking price to $5,000; ~38 % of homes belong to the agency, ~1.5 % to the showcase landlord, the rest
 * to the other landlords. A home for sale has no move-in day (ck_listings_available_from).
 */
export const seedListings = async (
    prisma: PrismaClient,
    owners: SeedOwners,
    today: Date,
): Promise<{ listings: number; photos: number; descriptions: number; retired: number }> => {
    const cityIds = new Map(
        (await prisma.city.findMany({ select: { id: true, slug: true } })).map((city) => [city.slug, city.id]),
    );
    const roll = random(20261113);
    const retired = await prisma.listingPhoto.deleteMany({
        where: { url: { startsWith: RETIRED_PHOTO_HOST } },
    });
    let listings = 0;
    let photos = 0;
    let descriptions = 0;
    const ranges: { kind: ListingKind; from: number; to: number }[] = [
        { kind: ListingKind.RENT, from: 0, to: LISTING_COUNT },
        { kind: ListingKind.SALE, from: SALE_ID_OFFSET, to: SALE_ID_OFFSET + SALE_LISTING_COUNT },
    ];
    for (const { kind, from, to } of ranges) {
        for (let start = from; start < to; start += CREATE_MANY_BATCH_SIZE) {
            const rows = [];
            const photoRows = [];
            const realigned: { id: string; description: string }[] = [];
            const end = Math.min(start + CREATE_MANY_BATCH_SIZE, to);
            const batchIds = Array.from({ length: end - start }, (_, offset) => listingId(start + offset));
            const existing = new Set(
                (await prisma.listing.findMany({ where: { id: { in: batchIds } }, select: { id: true } })).map(
                    (row) => row.id,
                ),
            );
            for (let index = start; index < end; index += 1) {
                const city = pick(CITIES, roll());
                const cityId = cityIds.get(city.slug);
                if (!cityId) {
                    throw new Error(`Seed city not found: ${city.slug}`);
                }
                const type = pick(PROPERTY_TYPES, roll());
                const bedrooms =
                    type === PropertyType.STUDIO
                        ? 0
                        : type === PropertyType.HOUSE
                          ? 2 + Math.floor(roll() * 3)
                          : 1 + Math.floor(roll() * 3);
                const bathrooms = bedrooms <= 1 ? 1 : pick([1, 1.5, 2, 2, 2.5], roll());
                const sizeSqft = Math.round(
                    (type === PropertyType.STUDIO ? 420 : 520 + bedrooms * 260) * (0.85 + roll() * 0.4),
                );
                const price =
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
                const neighborhood = pick(city.neighborhoods, roll());
                const feature = pick(FEATURES, roll());
                const secondFeature = pick(FEATURES, roll());
                const isPetFriendly = roll() < 0.55;
                const isFurnished = roll() < 0.3;
                const hasParking = roll() < 0.5;
                const ownerRoll = roll();
                const owner =
                    ownerRoll < 0.38
                        ? {
                              agencyId: owners.agencyId,
                              landlordId: null,
                              createdBy: pick(owners.agentIds, roll()),
                          }
                        : ownerRoll < 0.395
                          ? {
                                agencyId: null,
                                landlordId: owners.demoLandlordId,
                                createdBy: owners.demoLandlordId,
                            }
                          : {
                                agencyId: null,
                                landlordId: pick(owners.landlordIds, roll()),
                                createdBy: null as string | null,
                            };
                if (owner.createdBy === null) {
                    owner.createdBy = owner.landlordId;
                }
                const statusRoll = roll();
                const status =
                    statusRoll < 0.82
                        ? ListingStatus.PUBLISHED
                        : statusRoll < 0.88
                          ? ListingStatus.DRAFT
                          : statusRoll < 0.96
                            ? ListingStatus.UNPUBLISHED
                            : ListingStatus.SUSPENDED;
                const publishedDaysAgo = Math.floor(roll() * 120);
                const publishedAt =
                    status === ListingStatus.DRAFT ? null : new Date(today.getTime() - publishedDaysAgo * DAY_MS);
                const availableAt = new Date(today.getTime() + Math.floor(roll() * 100 - 10) * DAY_MS);
                const streetNumber = 100 + Math.floor(roll() * 4800);
                const unit =
                    type === PropertyType.HOUSE || type === PropertyType.TOWNHOUSE
                        ? null
                        : `Unit ${1 + Math.floor(roll() * 40)}${pick(['A', 'B', 'C', ''], roll())}`;
                const photoCount = 3 + Math.floor(roll() * 4);
                const description = describe(
                    index,
                    kind,
                    type,
                    bedrooms,
                    bathrooms,
                    city,
                    neighborhood,
                    feature,
                    secondFeature,
                    isPetFriendly,
                    isFurnished,
                    hasParking,
                );
                if (existing.has(listingId(index))) {
                    realigned.push({ id: listingId(index), description });
                    continue;
                }
                rows.push({
                    id: listingId(index),
                    landlordId: owner.landlordId,
                    agencyId: owner.agencyId,
                    title: `${pick(ADJECTIVES, roll())} ${type === PropertyType.STUDIO ? 'studio' : `${bedrooms}-bedroom ${type.toLowerCase()}`} in ${neighborhood}${kind === ListingKind.SALE ? ' for sale' : ''}`,
                    description,
                    propertyType: type,
                    kind,
                    price,
                    currency: 'USD',
                    bedrooms,
                    bathrooms,
                    sizeSqft,
                    addressLine1: `${streetNumber} ${pick(city.streets, roll())}`,
                    addressLine2: unit,
                    cityId,
                    neighborhood,
                    zip: `${city.zipPrefix}${String(Math.floor(roll() * 90) + 10).padStart(2, '0')}`,
                    isPetFriendly,
                    isFurnished,
                    hasParking,
                    availableAt:
                        kind === ListingKind.RENT
                            ? new Date(
                                  Date.UTC(
                                      availableAt.getUTCFullYear(),
                                      availableAt.getUTCMonth(),
                                      availableAt.getUTCDate(),
                                  ),
                              )
                            : null,
                    status,
                    publishedAt,
                    createdBy: owner.createdBy,
                    isDemo: true,
                });
                const isHouse = type === PropertyType.HOUSE || type === PropertyType.TOWNHOUSE;
                for (let photoIndex = 0; photoIndex < photoCount; photoIndex += 1) {
                    photoRows.push({
                        id: photoId(index, photoIndex),
                        listingId: listingId(index),
                        url: photoUrl(index, photoIndex, isHouse),
                        position: photoIndex,
                    });
                }
            }
            if (realigned.length > 0) {
                descriptions += await prisma.$executeRaw`
          UPDATE listings AS l SET description = d.description
          FROM unnest(${realigned.map((row) => row.id)}::uuid[], ${realigned.map((row) => row.description)}::text[]) AS d(id, description)
          WHERE l.id = d.id AND l.description <> d.description`;
                await prisma.$executeRaw`
          UPDATE listings SET is_demo = true
          WHERE id = ANY(${realigned.map((row) => row.id)}::uuid[]) AND NOT is_demo`;
            }
            if (rows.length === 0) {
                continue;
            }
            const created = await prisma.listing.createMany({ data: rows });
            listings += created.count;
            const createdPhotos = await prisma.listingPhoto.createMany({ data: photoRows });
            photos += createdPhotos.count;
        }
    }
    return { listings, photos, descriptions, retired: retired.count };
};
