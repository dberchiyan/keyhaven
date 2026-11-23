import type { PropertyType } from './catalogue-schema';

export interface HomeWords {
    studio: string;
    bed: string;
    beds: string;
    bath: string;
    baths: string;
    sqft: string;
    perMonth: string;
    available: string;
    forSale: string;
    types: Record<PropertyType, string>;
}

export const HOME_WORDS: HomeWords = {
    studio: 'Studio',
    bed: 'bed',
    beds: 'beds',
    bath: 'bath',
    baths: 'baths',
    sqft: 'sq ft',
    perMonth: '/mo',
    available: 'Available {date}',
    forSale: 'For sale',
    types: {
        APARTMENT: 'Apartments',
        HOUSE: 'Houses',
        CONDO: 'Condos',
        TOWNHOUSE: 'Townhouses',
        STUDIO: 'Studios',
    },
};
