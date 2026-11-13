import type { TFunction } from 'i18next';
import { formatMoney, type Money } from '@/shared/lib/money';

/** "$1,850/mo" for a rental, "$425,000" for a home for sale — from the string amount (data.md → Money). */
export const formatPrice = (
  listing: { kind: 'RENT' | 'SALE'; price: Money },
  locale: string,
  t: TFunction<'listing'>,
): string =>
  listing.kind === 'RENT'
    ? t('card.perMonth', { rent: formatMoney(listing.price, locale) })
    : formatMoney(listing.price, locale);

/** The availability pill: the move-in day of a rental, "For sale" otherwise. */
export const formatAvailability = (
  listing: { kind: 'RENT' | 'SALE'; availableFrom: string | null },
  locale: string,
  t: TFunction<'listing'>,
): string =>
  listing.kind === 'RENT' && listing.availableFrom
    ? t('card.availableFrom', { date: formatDay(listing.availableFrom, locale) })
    : t('card.forSale');

/** "Studio", "2 beds". */
export const formatBeds = (bedrooms: number, t: TFunction<'listing'>): string =>
  bedrooms === 0 ? t('facts.studio') : t('facts.beds', { count: bedrooms });

/** "1 bath", "1.5 baths" — the API sends a decimal string with one place (a count, not money). */
export const formatBaths = (bathrooms: string, t: TFunction<'listing'>): string =>
  t('facts.baths', { count: Number(bathrooms) });

/** "1,240 sq ft". */
export const formatSize = (sizeSqft: number, locale: string, t: TFunction<'listing'>): string =>
  t('facts.sqft', { formatted: new Intl.NumberFormat(locale).format(sizeSqft) });

/** A `YYYY-MM-DD` day, shown as a date (days are UTC everywhere). */
export const formatDay = (day: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
  );

/** An instant, shown with its time (UTC). */
export const formatInstant = (iso: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(iso));
