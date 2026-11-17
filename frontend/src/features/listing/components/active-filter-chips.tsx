import Chip from '@mui/material/Chip';
import type { TFunction } from 'i18next';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { SearchFilters } from '@/shared/lib/listing-search';
import { formatMoney } from '@/shared/lib/money';

import type { DrawerKey } from '../hooks/use-filter-draft';

export interface ActiveFilterChipsProps {
    filters: SearchFilters;
    onRemove: (keys: readonly DrawerKey[]) => void;
}

interface ActiveChip {
    keys: readonly DrawerKey[];
    label: string;
}

/** The price range is one chip, so removing it clears both bounds at once. */
const priceChips = (
    filters: SearchFilters,
    t: TFunction<'listing'>,
    money: (amount: string) => string,
): ActiveChip[] => {
    if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
        return [
            {
                keys: ['priceMin', 'priceMax'],
                label: t('filters.chip.priceBetween', { min: money(filters.priceMin), max: money(filters.priceMax) }),
            },
        ];
    }
    if (filters.priceMin !== undefined) {
        return [{ keys: ['priceMin'], label: t('filters.chip.priceFrom', { min: money(filters.priceMin) }) }];
    }
    if (filters.priceMax !== undefined) {
        return [{ keys: ['priceMax'], label: t('filters.chip.priceTo', { max: money(filters.priceMax) }) }];
    }
    return [];
};

/** The drawer's filters that are on, one removable chip each (text and city show in the toolbar). */
export function ActiveFilterChips({ filters, onRemove }: ActiveFilterChipsProps): ReactElement | null {
    const { t, i18n } = useTranslation('listing');
    const money = (amount: string): string => formatMoney({ amount, currency: 'USD' }, i18n.language);
    const chips: ActiveChip[] = [
        ...(filters.type === undefined ? [] : [{ keys: ['type'] as const, label: t(`facts.type.${filters.type}`) }]),
        ...priceChips(filters, t, money),
        ...(filters.beds === undefined
            ? []
            : [{ keys: ['beds'] as const, label: t('filters.chip.beds', { count: filters.beds }) }]),
        ...(filters.baths === undefined
            ? []
            : [{ keys: ['baths'] as const, label: t('filters.chip.baths', { count: filters.baths }) }]),
        ...(filters.isPetFriendly ? [{ keys: ['isPetFriendly'] as const, label: t('filters.isPetFriendly') }] : []),
        ...(filters.isFurnished ? [{ keys: ['isFurnished'] as const, label: t('filters.isFurnished') }] : []),
        ...(filters.hasParking ? [{ keys: ['hasParking'] as const, label: t('filters.hasParking') }] : []),
        ...(filters.moveInAt === undefined
            ? []
            : [
                  {
                      keys: ['moveInAt'] as const,
                      label: t('filters.chip.moveInAt', {
                          date: new Intl.DateTimeFormat(i18n.language, {
                              dateStyle: 'medium',
                              timeZone: 'UTC',
                          }).format(new Date(filters.moveInAt)),
                      }),
                  },
              ]),
    ];
    if (chips.length === 0) {
        return null;
    }
    return (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {chips.map((chip) => (
                <li key={chip.keys.join('+')}>
                    <Chip
                        size="small"
                        label={chip.label}
                        onDelete={() => {
                            onRemove(chip.keys);
                        }}
                        aria-label={t('filters.chip.remove', { filter: chip.label })}
                    />
                </li>
            ))}
        </ul>
    );
}
