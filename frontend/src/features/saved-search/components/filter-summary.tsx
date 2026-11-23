import Chip from '@mui/material/Chip';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { SearchFilters } from '@/shared/lib/listing-search';
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

/** The filters in words, one chip each; the kind (for rent / for sale) always comes first. */
export function FilterSummary({ filters }: FilterSummaryProps): ReactElement {
    const { t, i18n } = useTranslation('savedSearch');
    const money = (amount: string): string => formatMoney({ amount, currency: 'USD' }, i18n.language);
    const day = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeZone: 'UTC' });
    const rent = (): string[] => {
        if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
            return [
                t('summary.priceBetween', {
                    min: money(filters.priceMin),
                    max: money(filters.priceMax),
                }),
            ];
        }
        if (filters.priceMin !== undefined) {
            return [t('summary.priceFrom', { min: money(filters.priceMin) })];
        }
        if (filters.priceMax !== undefined) {
            return [t('summary.priceTo', { max: money(filters.priceMax) })];
        }
        return [];
    };
    const chips: string[] = [
        t(filters.kind === 'sale' ? 'summary.forSale' : 'summary.forRent'),
        ...(filters.q === undefined ? [] : [t('summary.text', { text: filters.q })]),
        ...(filters.type === undefined ? [] : [t(`summary.type.${filters.type}`)]),
        ...(filters.city === undefined ? [] : [cityName(filters.city)]),
        ...rent(),
        ...(filters.beds === undefined ? [] : [t('summary.beds', { count: filters.beds })]),
        ...(filters.baths === undefined ? [] : [t('summary.baths', { count: filters.baths })]),
        ...(filters.isPetFriendly ? [t('summary.isPetFriendly')] : []),
        ...(filters.isFurnished ? [t('summary.isFurnished')] : []),
        ...(filters.hasParking ? [t('summary.hasParking')] : []),
        ...(filters.moveInOn === undefined
            ? []
            : [t('summary.moveInOn', { date: day.format(new Date(filters.moveInOn)) })]),
    ];
    return (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {chips.map((chip) => (
                <li key={chip}>
                    <Chip size="small" label={chip} />
                </li>
            ))}
        </ul>
    );
}
