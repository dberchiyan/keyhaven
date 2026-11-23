/**
 * A snapshot of the catalogue for the prerendered city pages (`/rent/<city>`, `/buy/<city>`):
 * counts, the median price, the types, the neighborhoods and the newest homes per city and
 * kind. Read from the running API (KEYHAVEN_API_URL, the local backend by default), checked
 * against the schema and written to `src/content/catalogue.json`, which is committed: the build
 * never needs the backend.
 *
 *   npm run snapshot          # with the backend on :3000 and the seed loaded
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'astro/zod';

import { CatalogueSchema, type CityKind, KINDS, PROPERTY_TYPES } from '../src/content/catalogue-schema.ts';
import { CITIES } from '../src/content/site.ts';

const API = process.env['KEYHAVEN_API_URL'] ?? 'http://localhost:3000';
const PAGE_SIZE = 100;
const NEWEST_SHOWN = 8;
const CENTS = 100n;

const CardSchema = z.object({
    id: z.string(),
    title: z.string(),
    propertyType: z.enum(PROPERTY_TYPES),
    price: z.object({ amount: z.string() }),
    bedrooms: z.number().int(),
    bathrooms: z.string(),
    sizeSqft: z.number().int(),
    neighborhood: z.string().nullable(),
    availableOn: z.string().nullable(),
    coverPhotoUrl: z.string().nullable(),
});

type Card = z.infer<typeof CardSchema>;

const PageSchema = z.object({ content: z.array(CardSchema), totalElements: z.number().int() });

/** Every published home of a city and kind, newest first, page by page. */
const fetchAll = async (city: string, kind: string): Promise<Card[]> => {
    const all: Card[] = [];
    for (let page = 0; ; page += 1) {
        const url = `${API}/api/v1/listings?kind=${kind}&city=${city}&sort=publishedAt,desc&page=${page}&size=${PAGE_SIZE}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`${url} answered ${response.status}`);
        }
        const body = PageSchema.parse(await response.json());
        all.push(...body.content);
        if (all.length >= body.totalElements || body.content.length === 0) {
            return all;
        }
    }
};

/** Exact median of decimal strings: cents as BigInt, the lower of the two middle values. */
const median = (amounts: string[]): string | null => {
    if (amounts.length === 0) {
        return null;
    }
    const cents = amounts
        .map((amount) => {
            const [whole = '0', fraction = ''] = amount.split('.');
            return BigInt(whole) * CENTS + BigInt(fraction.padEnd(2, '0').slice(0, 2));
        })
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const middle = cents[Math.floor((cents.length - 1) / 2)] ?? 0n;
    return `${middle / CENTS}.${String(middle % CENTS).padStart(2, '0')}`;
};

/** Counts per key, the largest first. */
const countBy = <T>(items: T[], keyOf: (item: T) => string | null): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const item of items) {
        const key = keyOf(item);
        if (key !== null) {
            counts[key] = (counts[key] ?? 0) + 1;
        }
    }
    return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
};

/** One city and kind as the city page reads it. */
const summarise = (cards: Card[]): CityKind => ({
    total: cards.length,
    medianPrice: median(cards.map((card) => card.price.amount)),
    types: countBy(cards, (card) => card.propertyType),
    neighborhoods: countBy(cards, (card) => card.neighborhood),
    newest: cards.slice(0, NEWEST_SHOWN).map((card) => ({
        id: card.id,
        title: card.title,
        propertyType: card.propertyType,
        price: card.price.amount,
        bedrooms: card.bedrooms,
        bathrooms: card.bathrooms,
        sizeSqft: card.sizeSqft,
        neighborhood: card.neighborhood,
        availableOn: card.availableOn,
        coverPhotoUrl: card.coverPhotoUrl,
    })),
});

const cities = Object.fromEntries(
    await Promise.all(
        CITIES.map(async (city) => {
            const [rent, sale] = await Promise.all(
                KINDS.map(async (kind) => summarise(await fetchAll(city.slug, kind))),
            );
            return [city.slug, { RENT: rent, SALE: sale }];
        }),
    ),
);
const snapshot = CatalogueSchema.parse({ takenOn: new Date().toISOString().slice(0, 10), cities });
const out = resolve(import.meta.dirname, '../src/content/catalogue.json');
writeFileSync(out, `${JSON.stringify(snapshot, null, 4)}\n`);
process.stdout.write(`Catalogue snapshot written to ${out}\n`);
