import { ListingKind } from '@/modules/listing/service/listing-kind';
import { PropertyType } from '@/modules/listing/service/property-type';

import type { SeedCity } from './seed-data';
import { cycle } from './seed-random';

export const ADJECTIVES = [
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
export const FEATURES = [
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
export interface DescribedHome {
    kind: ListingKind;
    type: PropertyType;
    bedrooms: number;
    bathrooms: number;
    city: SeedCity;
    neighborhood: string;
    feature: string;
    secondFeature: string;
    isPetFriendly: boolean;
    isFurnished: boolean;
    hasParking: boolean;
}

const termsOf = (index: number, home: DescribedHome): string =>
    home.kind === ListingKind.RENT
        ? [
              home.isPetFriendly ? 'Pets are welcome.' : 'No pets, please.',
              home.isFurnished ? 'Comes fully furnished.' : 'Unfurnished — bring your own style.',
              home.hasParking ? 'One parking spot is included.' : 'Street parking nearby.',
              cycle(RENT_TERMS, index),
          ].join(' ')
        : [
              home.hasParking ? 'One parking spot comes with the home.' : 'Street parking only.',
              cycle(SALE_TERMS, index),
          ].join(' ');

/**
 * Two or three paragraphs — the home, the area, the terms — from the row's own attributes, picked by the listing's
 * index so a re-run writes the same text; every third listing folds the area into the first paragraph.
 */
export const describe = (index: number, home: DescribedHome): string => {
    const label =
        home.type === PropertyType.STUDIO
            ? 'studio'
            : `${home.bedrooms}-bedroom, ${home.bathrooms}-bath ${home.type.toLowerCase()}`;
    const intro = `A ${label} in ${home.neighborhood}, ${home.city.name}, with ${home.feature} and ${home.secondFeature}. ${cycle(LIGHT, index)}`;
    const area = cycle(AREA, index >> 2)
        .replaceAll('{n}', home.neighborhood)
        .replaceAll('{c}', home.city.name);
    const terms = termsOf(index, home);
    return index % 3 === 0 ? `${intro} ${area}\n\n${terms}` : `${intro}\n\n${area}\n\n${terms}`;
};
