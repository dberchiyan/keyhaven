import { dollars, fill, homeFacts, monthDay } from '../lib/format';
import { CATALOGUE } from './catalogue';
import type { SnapshotHome } from './catalogue-schema';
import { HOME_WORDS } from './home-words';
import { CITIES, type City, type CitySlug } from './site';

export interface ShowcaseHome {
    id: string;
    title: string;
    price: string;
    facts: string;
    place: string;
    pill: string;
    photo: string;
    cityName: string;
    neighborhood: string | null;
    bedrooms: number;
    bathrooms: string;
    sizeSqft: number;
}

export interface ShareCard {
    price: string;
    title: string;
    facts: string;
    place: string;
    pill: string;
}

export interface SummaryHome extends ShowcaseHome {
    nearbyCount: number;
}

type PhotographedHome = SnapshotHome & { coverPhotoUrl: string };

const DEMO_PHOTO_MINIMUM = 9;

const hasPhoto = (home: SnapshotHome): home is PhotographedHome => home.coverPhotoUrl !== null;

const placeOf = (home: SnapshotHome, city: City): string =>
    [home.neighborhood, `${city.name}, ${city.state}`].filter(Boolean).join(' · ');

const pillOf = (home: SnapshotHome): string =>
    home.availableOn ? fill(HOME_WORDS.available, { date: monthDay(home.availableOn) }) : HOME_WORDS.forSale;

/** A share image's card: a real home (LD-7); only rentals carry a move-in day, so only they read per month. */
export const shareCardOf = (home: SnapshotHome, city: City): ShareCard => ({
    price: home.availableOn ? `${dollars(home.price)}${HOME_WORDS.perMonth}` : dollars(home.price),
    title: home.title,
    facts: homeFacts(home),
    place: placeOf(home, city),
    pill: pillOf(home),
});

const toShowcase = (home: PhotographedHome, city: City): ShowcaseHome => ({
    id: home.id,
    title: home.title,
    price: dollars(home.price),
    facts: homeFacts(home),
    place: placeOf(home, city),
    pill: pillOf(home),
    photo: home.coverPhotoUrl,
    cityName: city.name,
    neighborhood: home.neighborhood,
    bedrooms: home.bedrooms,
    bathrooms: home.bathrooms,
    sizeSqft: home.sizeSqft,
});

/** Unsplash ids repeat across the seed's homes (its pool is small), so a picture is known by its URL without the query. */
const photoKey = (url: string): string => url.replace(/\?.*$/, '');

/** The newest rentals of a city whose picture no earlier section took: one picture per page. */
const pick = (slug: CitySlug, used: Set<string>, count: number): ShowcaseHome[] => {
    const city = CITIES.find((candidate) => candidate.slug === slug);
    if (!city) {
        return [];
    }
    const fresh = (CATALOGUE.cities[slug]?.RENT.newest ?? []).filter(
        (home): home is PhotographedHome => hasPhoto(home) && !used.has(photoKey(home.coverPhotoUrl)),
    );
    const picked = fresh.slice(0, count);
    for (const home of picked) {
        used.add(photoKey(home.coverPhotoUrl));
    }
    return picked.map((home) => toShowcase(home, city));
};

const pickedForSummary = new Set<string>();

/**
 * The share image's homes come first: the hero film, the summary card and the dashboard were cut
 * around the pictures left after them, so taking them first keeps every frame as designed.
 */
const pickShareHomes = (): ShowcaseHome[] => [
    ...pick('seattle', pickedForSummary, 1),
    ...pick('austin', pickedForSummary, 1),
    ...pick('denver', pickedForSummary, 1),
];

const shareHomes = pickShareHomes();

export const DEFAULT_SHARE_CARD: ShareCard | undefined = shareHomes[0] && {
    ...shareHomes[0],
    price: `${shareHomes[0].price}${HOME_WORDS.perMonth}`,
};

const summaryPick = pick('seattle', pickedForSummary, 1)[0];

/** The listing section's example: a Seattle rental and how many more homes its neighborhood lists. */
export const SUMMARY_HOME: SummaryHome | undefined = summaryPick && {
    ...summaryPick,
    nearbyCount: Math.max(0, (CATALOGUE.cities.seattle?.RENT.neighborhoods[summaryPick.neighborhood ?? ''] ?? 1) - 1),
};

const pickedForDashboard = new Set<string>(pickedForSummary);

/** The owner's dashboard rows: three homes of three cities. */
export const DASHBOARD_HOMES: ShowcaseHome[] = [
    ...pick('austin', pickedForDashboard, 1),
    ...pick('seattle', pickedForDashboard, 1),
    ...pick('denver', pickedForDashboard, 1),
];

const pickedForCities = new Set<string>(pickedForDashboard);

/** One cover per city tile, a picture no other section shows. */
export const CITY_PHOTOS: Partial<Record<CitySlug, string>> = Object.fromEntries(
    CITIES.map((city) => [city.slug, pick(city.slug, pickedForCities, 1)[0]?.photo]),
);

/**
 * Pictures for the hero film's made-up homes: the snapshot's covers no other section shows, so no
 * card repeats lower on the page; the whole pool when the rest of the page took too many.
 */
const collectDemoPhotos = (): string[] => {
    const all = CITIES.flatMap((city) => CATALOGUE.cities[city.slug]?.RENT.newest ?? [])
        .filter(hasPhoto)
        .map((home) => home.coverPhotoUrl);
    const distinct = [...new Map(all.map((url) => [photoKey(url), url])).values()];
    const fresh = distinct.filter((url) => !pickedForCities.has(photoKey(url)));
    return fresh.length >= DEMO_PHOTO_MINIMUM ? fresh : distinct;
};

export const DEMO_PHOTOS: string[] = collectDemoPhotos();

export const DEMO_TOTALS = {
    all: CITIES.reduce((sum, city) => sum + (CATALOGUE.cities[city.slug]?.RENT.total ?? 0), 0),
    seattle: CATALOGUE.cities.seattle?.RENT.total ?? 0,
};
