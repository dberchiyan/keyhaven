import Chip from '@mui/material/Chip';
import { useTranslation } from 'react-i18next';
import type { SearchFilters } from '@/shared/lib/listingSearch';
import { formatMoney } from '@/shared/lib/money';

export interface FilterSummaryProps {
  filters: SearchFilters;
}

/** A city slug as a name ("san-antonio" → "San Antonio"); the cities list is not needed for that. */
const cityName = (slug: string): string =>
  slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/** The filters in words, one chip each; "every home" when there are none. */
export function FilterSummary({ filters }: FilterSummaryProps) {
  const { t, i18n } = useTranslation('savedSearch');
  const money = (amount: string): string => formatMoney({ amount, currency: 'USD' }, i18n.language);
  const day = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeZone: 'UTC' });
  const rent = (): string[] => {
    if (filters.rentMin !== undefined && filters.rentMax !== undefined) {
      return [
        t('summary.rentBetween', {
          min: money(filters.rentMin),
          max: money(filters.rentMax),
        }),
      ];
    }
    if (filters.rentMin !== undefined) {
      return [t('summary.rentFrom', { min: money(filters.rentMin) })];
    }
    if (filters.rentMax !== undefined) {
      return [t('summary.rentTo', { max: money(filters.rentMax) })];
    }
    return [];
  };
  const chips: string[] = [
    ...(filters.q === undefined ? [] : [t('summary.text', { text: filters.q })]),
    ...(filters.city === undefined ? [] : [cityName(filters.city)]),
    ...rent(),
    ...(filters.beds === undefined ? [] : [t('summary.beds', { count: filters.beds })]),
    ...(filters.baths === undefined ? [] : [t('summary.baths', { count: filters.baths })]),
    ...(filters.pets ? [t('summary.pets')] : []),
    ...(filters.furnished ? [t('summary.furnished')] : []),
    ...(filters.parking ? [t('summary.parking')] : []),
    ...(filters.availableBy === undefined
      ? []
      : [t('summary.availableBy', { date: day.format(new Date(filters.availableBy)) })]),
  ];
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {chips.length === 0 ? (
        <li>
          <Chip size="small" label={t('summary.everything')} />
        </li>
      ) : (
        chips.map((chip) => (
          <li key={chip}>
            <Chip size="small" label={chip} />
          </li>
        ))
      )}
    </ul>
  );
}
