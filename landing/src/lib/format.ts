import type { SnapshotHome } from '../content/catalogue-schema';
import { HOME_WORDS } from '../content/home-words';

const LOCALE = 'en-US';
const WHOLE = new Intl.NumberFormat(LOCALE);
const MEDIUM_DAY = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: 'UTC' });
const LONG_DAY = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long', timeZone: 'UTC' });
const MONTH_DAY = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', timeZone: 'UTC' });

const toInstant = (day: string): Date => new Date(`${day}T12:00:00Z`);

/** Money arrives as a decimal string (BE money rule): whole dollars through BigInt, never a float. */
export const dollars = (amount: string): string => `$${WHOLE.format(BigInt(amount.split('.')[0] ?? '0'))}`;

export const wholeNumber = (value: number): string => WHOLE.format(value);

export const mediumDay = (day: string): string => MEDIUM_DAY.format(toInstant(day));

export const longDay = (day: string): string => LONG_DAY.format(toInstant(day));

export const monthDay = (day: string): string => MONTH_DAY.format(toInstant(day));

/** Copy keeps its placeholders (`{city}`) so a sentence stays whole in `content/` (LD-6). */
export const fill = (template: string, values: Record<string, string | number>): string =>
    template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));

/** "2 beds · 1.5 baths · 1,160 sq ft", the app's card line, with the words from `content/`. */
export const homeFacts = (home: Pick<SnapshotHome, 'bedrooms' | 'bathrooms' | 'sizeSqft'>): string => {
    const words = HOME_WORDS;
    const beds =
        home.bedrooms === 0 ? words.studio : `${home.bedrooms} ${home.bedrooms === 1 ? words.bed : words.beds}`;
    const bathCount = home.bathrooms.replace(/\.0+$/, '');
    const baths = `${bathCount} ${bathCount === '1' ? words.bath : words.baths}`;
    return [beds, baths, `${wholeNumber(home.sizeSqft)} ${words.sqft}`].join(' · ');
};
