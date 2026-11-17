import { CATALOGUE, dollars, type SnapshotHome } from './catalogue';
import { CITIES } from './site';

/**
 * Real homes for the drawn app screens: picked from the catalogue snapshot (the seed's own
 * listings, Unsplash photos), so the hero, the listing card, the dashboard and the city tiles
 * show what the demo shows. Deterministic: the same snapshot gives the same picks.
 */
export interface ShowcaseHome {
    id: string;
    title: string;
    price: string;
    facts: string;
    place: string;
    pill: string;
    photo: string;
    citySlug: string;
    cityName: string;
    state: string;
    neighborhood: string | null;
    bedrooms: number;
    bathrooms: string;
    sizeSqft: number;
}

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

const facts = (home: SnapshotHome): string =>
    [
        home.bedrooms === 0 ? 'Studio' : `${home.bedrooms} ${home.bedrooms === 1 ? 'bed' : 'beds'}`,
        `${home.bathrooms.replace(/\.0$/, '')} ${home.bathrooms === '1.0' ? 'bath' : 'baths'}`,
        `${home.sizeSqft.toLocaleString('en-US')} sq ft`,
    ].join(' · ');

const toShowcase = (home: SnapshotHome & { coverPhotoUrl: string }, city: (typeof CITIES)[number]): ShowcaseHome => ({
    id: home.id,
    title: home.title,
    price: `${dollars(home.price)}/mo`,
    facts: facts(home),
    place: [home.neighborhood, `${city.name}, ${city.state}`].filter(Boolean).join(' · '),
    pill: home.availableAt ? `Available ${MONTH.format(new Date(`${home.availableAt}T12:00:00Z`))}` : 'For sale',
    photo: home.coverPhotoUrl,
    citySlug: city.slug,
    cityName: city.name,
    state: city.state,
    neighborhood: home.neighborhood,
    bedrooms: home.bedrooms,
    bathrooms: home.bathrooms,
    sizeSqft: home.sizeSqft,
});

const hasPhoto = (home: SnapshotHome): home is SnapshotHome & { coverPhotoUrl: string } => home.coverPhotoUrl !== null;

/** Unsplash photo ids repeat across homes (the seed's pool is small): one picture per screen. */
const photoKey = (url: string): string => url.replace(/\?.*$/, '');

/** The newest rentals of a city with a photo not used yet. */
const pick = (slug: string, used: Set<string>, count: number): ShowcaseHome[] => {
    const city = CITIES.find((candidate) => candidate.slug === slug);
    const newest = CATALOGUE.cities[slug]?.RENT.newest ?? [];
    if (!city) {
        return [];
    }
    const picked: ShowcaseHome[] = [];
    for (const home of newest) {
        if (picked.length === count) {
            break;
        }
        if (!hasPhoto(home) || used.has(photoKey(home.coverPhotoUrl))) {
            continue;
        }
        used.add(photoKey(home.coverPhotoUrl));
        picked.push(toShowcase(home, city));
    }
    return picked;
};

const heroUsed = new Set<string>();
/** The hero's three search results: Seattle (the search box says "walingford"), then Austin and Denver. */
export const HERO_HOMES: ShowcaseHome[] = [
    ...pick('seattle', heroUsed, 1),
    ...pick('austin', heroUsed, 1),
    ...pick('denver', heroUsed, 1),
];

/** The listing page's example: a Seattle rental, with how many more homes its neighborhood has. */
const summaryPick = pick('seattle', heroUsed, 1)[0] ?? HERO_HOMES[0];
export const SUMMARY_HOME: (ShowcaseHome & { nearby: number }) | null = summaryPick
    ? {
          ...summaryPick,
          nearby: Math.max(0, (CATALOGUE.cities.seattle?.RENT.neighborhoods[summaryPick.neighborhood ?? ''] ?? 1) - 1),
      }
    : null;

const dashboardUsed = new Set<string>(heroUsed);
/** Three homes of three cities for the owner's dashboard rows. */
export const DASHBOARD_HOMES: ShowcaseHome[] = [
    ...pick('austin', dashboardUsed, 1),
    ...pick('seattle', dashboardUsed, 1),
    ...pick('denver', dashboardUsed, 1),
];

const cityUsed = new Set<string>(dashboardUsed);
/** One photo per city tile: the newest home of the city with a picture no other section uses. */
export const CITY_PHOTOS: Record<string, string> = Object.fromEntries(
    CITIES.map((city) => [city.slug, pick(city.slug, cityUsed, 1)[0]?.photo ?? '']),
);

/**
 * Pictures for the hero's search demo: every distinct cover of the snapshot that no other
 * section uses, so the demo's made-up homes look like the catalogue without repeating a card
 * from lower on the page. Falls back to the whole pool when the rest of the page took most.
 */
const demoPool = (): string[] => {
    const all = CITIES.flatMap((city) => CATALOGUE.cities[city.slug]?.RENT.newest ?? [])
        .filter(hasPhoto)
        .map((home) => home.coverPhotoUrl);
    const distinct = [...new Map(all.map((url) => [photoKey(url), url])).values()];
    const fresh = distinct.filter((url) => !cityUsed.has(photoKey(url)));
    return fresh.length >= 9 ? fresh : distinct;
};
export const DEMO_PHOTOS: string[] = demoPool();

/** The catalogue's figures the demo's result line counts down through. */
export const DEMO_TOTALS = {
    all: CITIES.reduce((sum, city) => sum + (CATALOGUE.cities[city.slug]?.RENT.total ?? 0), 0),
    seattle: CATALOGUE.cities.seattle?.RENT.total ?? 0,
};
