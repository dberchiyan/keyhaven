/**
 * A snapshot of the catalogue for the prerendered city pages (`/rent/<city>`, `/buy/<city>`):
 * counts, the median price, the types, the neighborhoods and the newest homes per city and
 * kind. Read from the running API (KEYHAVEN_API_URL, the local backend by default) and written
 * to `src/content/catalogue.json`, which is committed — the build never needs the backend.
 *
 *   npm run snapshot          # with the backend on :3000 and the seed loaded
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = process.env.KEYHAVEN_API_URL ?? 'http://localhost:3000';
const CITIES = ['austin', 'denver', 'seattle', 'chicago', 'atlanta', 'phoenix'] as const;
const KINDS = ['RENT', 'SALE'] as const;
const PAGE = 100;
/** Newest homes shown on a city page. */
const SHOWN = 8;

interface Card {
  id: string;
  title: string;
  propertyType: string;
  price: { amount: string; currency: string };
  bedrooms: number;
  bathrooms: string;
  sizeSqft: number;
  neighborhood: string | null;
  availableFrom: string | null;
  publishedAt: string | null;
  coverPhotoUrl: string | null;
  city: { name: string; state: string; slug: string };
}

const fetchAll = async (city: string, kind: string): Promise<Card[]> => {
  const all: Card[] = [];
  for (let page = 0; ; page += 1) {
    const url = `${API}/api/v1/listings?kind=${kind}&city=${city}&sort=publishedAt,desc&page=${page}&size=${PAGE}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${url} → ${response.status}`);
    }
    const body = (await response.json()) as { content: Card[]; totalElements: number };
    all.push(...body.content);
    if (all.length >= body.totalElements || body.content.length === 0) {
      return all;
    }
  }
};

/** Exact median of decimal strings: cents as BigInt, the middle value (the lower of two). */
const median = (amounts: string[]): string | null => {
  if (amounts.length === 0) {
    return null;
  }
  const cents = amounts
    .map((amount) => {
      const [whole = '0', fraction = ''] = amount.split('.');
      return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
    })
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = cents[Math.floor((cents.length - 1) / 2)] ?? 0n;
  return `${mid / 100n}.${String(mid % 100n).padStart(2, '0')}`;
};

const count = <T>(items: T[], key: (item: T) => string | null): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    if (k !== null) {
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
};

const snapshot: Record<string, Record<string, unknown>> = {};
for (const city of CITIES) {
  snapshot[city] = {};
  for (const kind of KINDS) {
    const cards = await fetchAll(city, kind);
    snapshot[city][kind] = {
      total: cards.length,
      medianPrice: median(cards.map((card) => card.price.amount)),
      types: count(cards, (card) => card.propertyType),
      neighborhoods: count(cards, (card) => card.neighborhood),
      newest: cards.slice(0, SHOWN).map((card) => ({
        id: card.id,
        title: card.title,
        propertyType: card.propertyType,
        price: card.price.amount,
        bedrooms: card.bedrooms,
        bathrooms: card.bathrooms,
        sizeSqft: card.sizeSqft,
        neighborhood: card.neighborhood,
        availableFrom: card.availableFrom,
        coverPhotoUrl: card.coverPhotoUrl,
      })),
    };
  }
}
const out = resolve(import.meta.dirname, '../src/content/catalogue.json');
writeFileSync(
  out,
  `${JSON.stringify({ takenAt: new Date().toISOString().slice(0, 10), cities: snapshot }, null, 2)}\n`,
);
// eslint-disable-next-line no-console -- a script's one line of output
console.log(`Catalogue snapshot → ${out}`);
