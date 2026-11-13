import type { PrismaClient } from '../src/generated/prisma/client';
import { ListingStatus } from '../src/modules/listing/service/listing-status';
import { PropertyType } from '../src/modules/listing/service/property-type';
import { CITIES, type SeedCity } from './seed-data';

/** ~1,000 homes across the six cities (TASK → M0 seed). */
export const LISTING_COUNT = 1000;

const DAY_MS = 86_400_000;
/** Rows per createMany statement — a comfortable size for one round trip. */
const BATCH = 200;

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

/** Fixed ids: a re-run skips rows that exist (idempotent seed, data.md). */
const listingId = (index: number): string =>
  `019a0000-0000-7000-8000-${String(index + 1).padStart(12, '0')}`;
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
/** The old provider's URLs: a re-seed replaces them (rows are matched by their fixed ids). */
const RETIRED_PHOTO_HOST = 'https://loremflickr.com/';

const photoUrl = (listingIndex: number, photoIndex: number, isHouse: boolean): string => {
  if (isHouse && photoIndex === 0) {
    return pick(EXTERIOR_PHOTOS, ((listingIndex * 7) % 97) / 97);
  }
  // Consecutive rooms differ: the pool is walked from a per-listing offset.
  const offset = (listingIndex * 11) % INTERIOR_PHOTOS.length;
  return pick(
    INTERIOR_PHOTOS,
    ((offset + photoIndex * 3) % INTERIOR_PHOTOS.length) / INTERIOR_PHOTOS.length,
  );
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

const describe = (
  type: PropertyType,
  bedrooms: number,
  bathrooms: number,
  city: SeedCity,
  neighborhood: string,
  feature: string,
  secondFeature: string,
  petsAllowed: boolean,
  furnished: boolean,
  parking: boolean,
): string => {
  const kind =
    type === PropertyType.STUDIO
      ? 'studio'
      : `${bedrooms}-bedroom, ${bathrooms}-bath ${type.toLowerCase()}`;
  const extras = [
    petsAllowed ? 'Pets are welcome.' : 'No pets, please.',
    furnished ? 'Comes fully furnished.' : 'Unfurnished — bring your own style.',
    parking ? 'One parking spot is included.' : 'Street parking nearby.',
  ].join(' ');
  return `A ${kind} in ${neighborhood}, ${city.name}, with ${feature} and ${secondFeature}. Minutes from cafés, groceries and transit. ${extras} Twelve-month lease; the first month and a deposit are due at signing.`;
};

export interface SeedOwners {
  agencyId: string;
  /** The showcase landlord gets a fixed share of the catalogue. */
  demoLandlordId: string;
  landlordIds: string[];
  /** The showcase agent and the other agents: recorded as the listing's creator. */
  agentIds: string[];
}

/** Returns how many listings (and photos) were added; existing rows are kept. */
export const seedListings = async (
  prisma: PrismaClient,
  owners: SeedOwners,
  today: Date,
): Promise<{ listings: number; photos: number; retired: number }> => {
  const cityIds = new Map(
    (await prisma.city.findMany({ select: { id: true, slug: true } })).map((city) => [
      city.slug,
      city.id,
    ]),
  );
  const roll = random(20261113);
  // Photos of an earlier seed pointed at a provider that no longer serves them: replaced.
  const retired = await prisma.listingPhoto.deleteMany({
    where: { url: { startsWith: RETIRED_PHOTO_HOST } },
  });
  let listings = 0;
  let photos = 0;
  for (let start = 0; start < LISTING_COUNT; start += BATCH) {
    const rows = [];
    const photoRows = [];
    for (let index = start; index < Math.min(start + BATCH, LISTING_COUNT); index += 1) {
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
      const rent =
        Math.round(
          (city.baseRent *
            (type === PropertyType.STUDIO ? 0.8 : 0.75 + bedrooms * 0.35) *
            (0.9 + roll() * 0.3)) /
            25,
        ) * 25;
      const neighborhood = pick(city.neighborhoods, roll());
      const feature = pick(FEATURES, roll());
      const secondFeature = pick(FEATURES, roll());
      const petsAllowed = roll() < 0.55;
      const furnished = roll() < 0.3;
      const parking = roll() < 0.5;
      // Who owns it: ~38 % the agency, ~1.5 % the showcase landlord, the rest spread over landlords.
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
        status === ListingStatus.DRAFT
          ? null
          : new Date(today.getTime() - publishedDaysAgo * DAY_MS);
      const availableFrom = new Date(today.getTime() + Math.floor(roll() * 100 - 10) * DAY_MS);
      const streetNumber = 100 + Math.floor(roll() * 4800);
      const unit =
        type === PropertyType.HOUSE || type === PropertyType.TOWNHOUSE
          ? null
          : `Unit ${1 + Math.floor(roll() * 40)}${pick(['A', 'B', 'C', ''], roll())}`;
      rows.push({
        id: listingId(index),
        landlordId: owner.landlordId,
        agencyId: owner.agencyId,
        title: `${pick(ADJECTIVES, roll())} ${type === PropertyType.STUDIO ? 'studio' : `${bedrooms}-bedroom ${type.toLowerCase()}`} in ${neighborhood}`,
        description: describe(
          type,
          bedrooms,
          bathrooms,
          city,
          neighborhood,
          feature,
          secondFeature,
          petsAllowed,
          furnished,
          parking,
        ),
        propertyType: type,
        rent,
        currency: 'USD',
        bedrooms,
        bathrooms,
        sizeSqft,
        addressLine1: `${streetNumber} ${pick(city.streets, roll())}`,
        addressLine2: unit,
        cityId,
        neighborhood,
        zip: `${city.zipPrefix}${String(Math.floor(roll() * 90) + 10).padStart(2, '0')}`,
        petsAllowed,
        furnished,
        parking,
        availableFrom: new Date(
          Date.UTC(
            availableFrom.getUTCFullYear(),
            availableFrom.getUTCMonth(),
            availableFrom.getUTCDate(),
          ),
        ),
        status,
        publishedAt,
        createdBy: owner.createdBy,
      });
      const photoCount = 3 + Math.floor(roll() * 4);
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
    const created = await prisma.listing.createMany({ data: rows, skipDuplicates: true });
    listings += created.count;
    const createdPhotos = await prisma.listingPhoto.createMany({
      data: photoRows,
      skipDuplicates: true,
    });
    photos += createdPhotos.count;
  }
  return { listings, photos, retired: retired.count };
};
