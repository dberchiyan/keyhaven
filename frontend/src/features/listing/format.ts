import type { TFunction } from 'i18next';
import { formatMoney, type Money } from '@/shared/lib/money';

/** "$1,850" — from the string amount, never a float (data.md → Money). */
export const formatRent = (rent: Money, locale: string): string => formatMoney(rent, locale);

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
