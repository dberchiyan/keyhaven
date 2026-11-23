import snapshot from './catalogue.json' with { type: 'json' };
import { type Catalogue, CatalogueSchema, type CityKind, type Kind, KINDS } from './catalogue-schema';
import { CITIES, type City } from './site';

export const CATALOGUE: Catalogue = CatalogueSchema.parse(snapshot);

/** The city pages exist only for cities the snapshot covers; a missing one fails the build rather than a page. */
export const cityKindOf = (city: City, kind: Kind): CityKind => {
    const data = CATALOGUE.cities[city.slug]?.[kind];
    if (!data) {
        throw new Error(`The catalogue snapshot has no ${kind} homes for ${city.slug}`);
    }
    return data;
};

export const CITY_KINDS = CITIES.flatMap((city) => KINDS.map((kind) => ({ city, kind })));
