import Chip from '@mui/material/Chip';
import { useTranslation } from 'react-i18next';
import type { SearchFilters } from '@/shared/lib/listingSearch';
import { formatMoney } from '@/shared/lib/money';
import type { DrawerKey } from '../hooks/useFilterDraft';

export interface ActiveFilterChipsProps {
  filters: SearchFilters;
  onRemove: (keys: readonly DrawerKey[]) => void;
}

interface ActiveChip {
  keys: readonly DrawerKey[];
  label: string;
}

/** The drawer's filters that are on, one removable chip each (text and city show in the toolbar). */
export function ActiveFilterChips({ filters, onRemove }: ActiveFilterChipsProps) {
  const { t, i18n } = useTranslation('listing');
  const money = (amount: string): string => formatMoney({ amount, currency: 'USD' }, i18n.language);
  const chips: ActiveChip[] = [
    ...(filters.type === undefined
      ? []
      : [{ keys: ['type'] as const, label: t(`facts.type.${filters.type}`) }]),
    ...(filters.priceMin !== undefined && filters.priceMax !== undefined
      ? [
          {
            keys: ['priceMin', 'priceMax'] as const,
            label: t('filters.chip.priceBetween', {
              min: money(filters.priceMin),
              max: money(filters.priceMax),
            }),
          },
        ]
      : filters.priceMin !== undefined
        ? [
            {
              keys: ['priceMin'] as const,
              label: t('filters.chip.priceFrom', { min: money(filters.priceMin) }),
            },
          ]
        : filters.priceMax !== undefined
          ? [
              {
                keys: ['priceMax'] as const,
                label: t('filters.chip.priceTo', { max: money(filters.priceMax) }),
              },
            ]
          : []),
    ...(filters.beds === undefined
      ? []
      : [{ keys: ['beds'] as const, label: t('filters.chip.beds', { count: filters.beds }) }]),
    ...(filters.baths === undefined
      ? []
      : [{ keys: ['baths'] as const, label: t('filters.chip.baths', { count: filters.baths }) }]),
    ...(filters.pets ? [{ keys: ['pets'] as const, label: t('filters.pets') }] : []),
    ...(filters.furnished ? [{ keys: ['furnished'] as const, label: t('filters.furnished') }] : []),
    ...(filters.parking ? [{ keys: ['parking'] as const, label: t('filters.parking') }] : []),
    ...(filters.availableBy === undefined
      ? []
      : [
          {
            keys: ['availableBy'] as const,
            label: t('filters.chip.availableBy', {
              date: new Intl.DateTimeFormat(i18n.language, {
                dateStyle: 'medium',
                timeZone: 'UTC',
              }).format(new Date(filters.availableBy)),
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
