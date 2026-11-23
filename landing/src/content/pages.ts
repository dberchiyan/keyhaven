import { dollars, fill } from '../lib/format';
import { CATALOGUE, CITY_KINDS, cityKindOf } from './catalogue';
import { CITY_PAGE } from './city-page';
import { LANDING } from './landing';
import { type LegalPage, NOT_FOUND, PRIVACY, TERMS } from './legal';
import { DEFAULT_SHARE_CARD, type ShareCard, shareCardOf } from './showcase';
import { SITE } from './site';

export interface PageMeta {
    path: string;
    title: string;
    description: string;
    shareHeading: string;
    shareEyebrow: string;
    shareCard: ShareCard | undefined;
    updatedOn: string;
    isIndexed: boolean;
}

export const INDEX_PATH = '/';

export const NOT_FOUND_PATH = '/404';

const cityPages = (): PageMeta[] =>
    CITY_KINDS.map(({ city, kind }) => {
        const data = cityKindOf(city, kind);
        const copy = CITY_PAGE.kinds[kind];
        const place = `${city.name}, ${city.state}`;
        const shareHome = data.newest[0];
        return {
            path: `/${copy.segment}/${city.slug}`,
            title: fill(copy.metaTitle, { city: place }),
            description: fill(copy.metaDescription, {
                city: city.name,
                count: data.total,
                median: data.medianPrice ? dollars(data.medianPrice) : CITY_PAGE.noMedian,
            }),
            shareHeading: fill(copy.title, { city: place }),
            shareEyebrow: copy.shareKind,
            shareCard: shareHome ? shareCardOf(shareHome, city) : DEFAULT_SHARE_CARD,
            updatedOn: CATALOGUE.takenOn,
            isIndexed: true,
        };
    });

const legalPage = (page: LegalPage, path: string): PageMeta => ({
    path,
    title: page.metaTitle,
    description: page.description,
    shareHeading: page.heading,
    shareEyebrow: SITE.name,
    shareCard: DEFAULT_SHARE_CARD,
    updatedOn: page.updatedOn,
    isIndexed: true,
});

export const PAGES: readonly PageMeta[] = [
    {
        path: INDEX_PATH,
        title: LANDING.meta.title,
        description: LANDING.meta.description,
        shareHeading: `${LANDING.hero.title.start} ${LANDING.hero.title.accent}`,
        shareEyebrow: LANDING.hero.eyebrow,
        shareCard: DEFAULT_SHARE_CARD,
        updatedOn: LANDING.meta.updatedOn,
        isIndexed: true,
    },
    ...cityPages(),
    legalPage(PRIVACY, SITE.links.privacy),
    legalPage(TERMS, SITE.links.terms),
    {
        path: NOT_FOUND_PATH,
        title: NOT_FOUND.metaTitle,
        description: NOT_FOUND.description,
        shareHeading: NOT_FOUND.heading,
        shareEyebrow: NOT_FOUND.eyebrow,
        shareCard: DEFAULT_SHARE_CARD,
        updatedOn: LANDING.meta.updatedOn,
        isIndexed: false,
    },
];

/** Every page reads its title, description and share image from here, so the build checks see one list. */
export const pageAt = (path: string): PageMeta => {
    const page = PAGES.find((candidate) => candidate.path === path);
    if (!page) {
        throw new Error(`No page meta for ${path}`);
    }
    return page;
};

/** `/` → `index`, `/rent/austin` → `rent/austin`: the share image's path under `/og/`. */
export const shareSlugOf = (path: string): string => (path === INDEX_PATH ? 'index' : path.slice(1));
