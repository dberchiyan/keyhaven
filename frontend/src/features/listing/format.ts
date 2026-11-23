import type { TFunction } from 'i18next';

import { formatMoney, type Money } from '@/shared/lib/money';

/** A rental's price is per month, a sale's is the whole price — formatted from the string amount, never a float (QRY-20). */
export const formatPrice = (
    listing: { kind: 'RENT' | 'SALE'; price: Money },
    locale: string,
    t: TFunction<'listing'>,
): string =>
    listing.kind === 'RENT'
        ? t('card.perMonth', { rent: formatMoney(listing.price, locale) })
        : formatMoney(listing.price, locale);

/** A home for sale has no move-in day, so its availability pill says "For sale" instead. */
export const formatAvailability = (
    listing: { kind: 'RENT' | 'SALE'; availableOn: string | null },
    locale: string,
    t: TFunction<'listing'>,
): string =>
    listing.kind === 'RENT' && listing.availableOn
        ? t('card.availableOn', { date: formatDay(listing.availableOn, locale) })
        : t('card.forSale');

/** Zero bedrooms is a studio, never "0 beds". */
export const formatBeds = (bedrooms: number, t: TFunction<'listing'>): string =>
    bedrooms === 0 ? t('facts.studio') : t('facts.beds', { count: bedrooms });

/** The API sends a decimal string with one place; `Number()` is safe here because it is a count, not money (QRY-20). */
export const formatBaths = (bathrooms: string, t: TFunction<'listing'>): string =>
    t('facts.baths', { count: Number(bathrooms) });

export const formatSize = (sizeSqft: number, locale: string, t: TFunction<'listing'>): string =>
    t('facts.sqft', { formatted: new Intl.NumberFormat(locale).format(sizeSqft) });

/** A `YYYY-MM-DD` day read in UTC (QRY-22), so it never shifts to the day before in the reader's zone. */
export const formatDay = (day: string, locale: string): string =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));

/** An instant with its time, in UTC like every time in the app (QRY-22). */
export const formatInstant = (iso: string, locale: string): string =>
    new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
    }).format(new Date(iso));
