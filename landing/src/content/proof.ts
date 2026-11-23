import { dollars, fill, mediumDay, wholeNumber } from '../lib/format';
import { CATALOGUE } from './catalogue';
import { LANDING } from './landing';
import { CITIES } from './site';

export interface ProofFigure {
    value: string;
    caption: string;
    href: string;
}

const { proof } = LANDING;
const cityData = Object.values(CATALOGUE.cities);
const totalOf = (kind: 'RENT' | 'SALE'): number => cityData.reduce((sum, city) => sum + city[kind].total, 0);
const medianCity = CITIES.find((city) => city.slug === proof.median.city);
const medianRent = CATALOGUE.cities[proof.median.city]?.RENT.medianPrice;

/**
 * The hero's proof strip, every figure counted from the committed catalogue snapshot (LD-7: nothing invented) and
 * linking to the page that shows it; a median the snapshot lacks drops out rather than showing a guess.
 */
export const PROOF_FIGURES: readonly ProofFigure[] = [
    { value: wholeNumber(totalOf('RENT')), ...proof.rent },
    { value: wholeNumber(totalOf('SALE')), ...proof.sale },
    { value: wholeNumber(cityData.length), ...proof.cities },
    ...(medianCity && medianRent
        ? [
              {
                  value: dollars(medianRent),
                  caption: fill(proof.median.caption, { city: medianCity.name }),
                  href: `/rent/${medianCity.slug}`,
              },
          ]
        : []),
];

export const PROOF_NOTE = fill(proof.note, { day: mediumDay(CATALOGUE.takenOn) });
