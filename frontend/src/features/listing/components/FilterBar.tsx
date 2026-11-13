import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/lib/money';
import { trackScrollEdges } from '@/shared/lib/scrollEdges';
import {
  BROWSE_SORTS,
  type BrowseParams,
  filtersOf,
  hasFilters,
  PROPERTY_TYPE_PARAMS,
  type SearchFilters,
} from '@/shared/lib/listingSearch';
import { type DrawerKey } from '../hooks/useFilterDraft';
import { useCities } from '../hooks/useListingQueries';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterDrawer } from './FilterDrawer';
import { FilterPill } from './FilterPill';

const BEDS = ['0', '1', '2', '3', '4'] as const;
const BATHS = ['1', '1.5', '2', '3'] as const;
/** The drawer holds what the pills do not: amenities and the move-in date. */
const MORE_KEYS: readonly DrawerKey[] = ['pets', 'furnished', 'parking', 'availableBy'];

type Change = Partial<Omit<BrowseParams, 'size' | 'page'>>;

export interface FilterBarProps {
  params: BrowseParams;
  total: number | undefined;
  onChange: (change: Change) => void;
  onClear: () => void;
  /** The "Save this search" control, when the role has it. */
  saveSearch?: ReactNode;
}

/**
 * The toolbar: one pill per filter (city, price, beds, baths, type), each opening a small popover
 * that applies at once; "More" opens the drawer with the rest; the sort on the right. Active
 * filters come back as removable chips. A text query from the landing's search shows as a chip.
 */
export function FilterBar({ params, total, onChange, onClear, saveSearch }: FilterBarProps) {
  const { t, i18n } = useTranslation('listing');
  const cities = useCities();
  const filters = filtersOf(params);
  const money = (amount: string): string => formatMoney({ amount, currency: 'USD' }, i18n.language);
  const city = cities.data?.find((candidate) => candidate.slug === params.city);
  const more = MORE_KEYS.filter((key) => filters[key] !== undefined).length;
  // The pills already show their own values; the chips repeat only what the drawer holds.
  const chipFilters: SearchFilters = {
    kind: filters.kind,
    ...(filters.pets === undefined ? {} : { pets: filters.pets }),
    ...(filters.furnished === undefined ? {} : { furnished: filters.furnished }),
    ...(filters.parking === undefined ? {} : { parking: filters.parking }),
    ...(filters.availableBy === undefined ? {} : { availableBy: filters.availableBy }),
  };

  // The drawer remounts on each opening (its draft starts from the URL every time).
  const [opening, setOpening] = useState(0);
  const [open, setOpen] = useState(false);

  const remove = (keys: readonly DrawerKey[]): void => {
    onChange(Object.fromEntries(keys.map((key) => [key, undefined])));
  };
  const priceValue =
    params.priceMin !== undefined && params.priceMax !== undefined
      ? `${money(params.priceMin)}–${money(params.priceMax)}`
      : params.priceMin !== undefined
        ? t('filters.chip.priceFrom', { min: money(params.priceMin) })
        : params.priceMax !== undefined
          ? t('filters.chip.priceTo', { max: money(params.priceMax) })
          : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        {/* The pills: one row that scrolls sideways on a phone, its edges faded (ux.md). */}
        <div
          ref={trackScrollEdges}
          className="app-scroll-fade app-scroll-quiet -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 md:mx-0 md:flex-wrap md:px-0"
        >
          <FilterPill label={t('browse.city')} {...(city ? { value: city.name } : {})}>
            {(close) => (
              <MenuList dense autoFocusItem>
                <MenuItem
                  selected={params.city === undefined}
                  onClick={() => {
                    onChange({ city: undefined });
                    close();
                  }}
                >
                  {t('browse.allCities')}
                </MenuItem>
                {(cities.data ?? []).map((option) => (
                  <MenuItem
                    key={option.id}
                    selected={option.slug === params.city}
                    onClick={() => {
                      onChange({ city: option.slug });
                      close();
                    }}
                  >
                    {`${option.name}, ${option.state}`}
                  </MenuItem>
                ))}
              </MenuList>
            )}
          </FilterPill>
          <FilterPill
            label={params.kind === 'rent' ? t('filters.rent') : t('filters.price')}
            {...(priceValue === undefined ? {} : { value: priceValue })}
          >
            {(close) => <PriceForm filters={filters} onApply={onChange} onDone={close} />}
          </FilterPill>
          <FilterPill
            label={t('filters.beds')}
            {...(params.beds === undefined
              ? {}
              : { value: t('filters.chip.beds', { count: params.beds }) })}
          >
            {(close) => (
              <Options
                options={['', ...BEDS]}
                selected={params.beds === undefined ? '' : String(params.beds)}
                labelOf={(option) =>
                  option === ''
                    ? t('filters.any')
                    : t('filters.bedsOption', { count: Number(option) })
                }
                onPick={(option) => {
                  onChange({ beds: option === '' ? undefined : Number(option) });
                  close();
                }}
              />
            )}
          </FilterPill>
          <FilterPill
            label={t('filters.baths')}
            {...(params.baths === undefined
              ? {}
              : { value: t('filters.chip.baths', { count: params.baths }) })}
          >
            {(close) => (
              <Options
                options={['', ...BATHS]}
                selected={params.baths ?? ''}
                labelOf={(option) =>
                  option === '' ? t('filters.any') : t('filters.bathsOption', { count: option })
                }
                onPick={(option) => {
                  onChange({ baths: option === '' ? undefined : option });
                  close();
                }}
              />
            )}
          </FilterPill>
          <FilterPill
            label={t('filters.type')}
            {...(params.type === undefined ? {} : { value: t(`facts.type.${params.type}`) })}
          >
            {(close) => (
              <Options
                options={['', ...PROPERTY_TYPE_PARAMS]}
                selected={params.type ?? ''}
                labelOf={(option) =>
                  option === '' ? t('filters.anyType') : t(`facts.type.${option}`)
                }
                onPick={(option) => {
                  onChange({
                    type: PROPERTY_TYPE_PARAMS.find((candidate) => candidate === option),
                  });
                  close();
                }}
              />
            )}
          </FilterPill>
          <FilterPill
            label={t('filters.more')}
            badge={more}
            onClick={() => {
              setOpening((count) => count + 1);
              setOpen(true);
            }}
          >
            {() => null}
          </FilterPill>
          <div className="md:hidden">
            <FilterPill
              label={t('browse.sort')}
              {...(params.sort === 'publishedAt,desc'
                ? {}
                : { value: t(`browse.sortOptions.${params.sort}`) })}
            >
              {(close) => (
                <Options
                  options={BROWSE_SORTS}
                  selected={params.sort}
                  labelOf={(option) => t(`browse.sortOptions.${option}`)}
                  onPick={(option) => {
                    onChange({ sort: option });
                    close();
                  }}
                />
              )}
            </FilterPill>
          </div>
        </div>
        <TextField
          select
          size="small"
          value={params.sort}
          onChange={(event) => {
            const sort = BROWSE_SORTS.find((candidate) => candidate === event.target.value);
            if (sort) {
              onChange({ sort });
            }
          }}
          slotProps={{ select: { 'aria-label': t('browse.sort') } }}
          className="hidden w-44 md:ml-auto md:flex"
        >
          {BROWSE_SORTS.map((option) => (
            <MenuItem key={option} value={option}>
              {t(`browse.sortOptions.${option}`)}
            </MenuItem>
          ))}
        </TextField>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Typography
          variant="body2"
          color="textSecondary"
          role="status"
          className="app-tabular whitespace-nowrap"
        >
          {total === undefined
            ? ''
            : t('browse.count', {
                count: total,
                formatted: new Intl.NumberFormat(i18n.language).format(total),
              })}
        </Typography>
        {params.q !== undefined && (
          <Chip
            size="small"
            label={t('filters.chip.text', { text: params.q })}
            onDelete={() => {
              onChange({ q: undefined });
            }}
            aria-label={t('filters.chip.remove', { filter: params.q })}
          />
        )}
        <ActiveFilterChips filters={chipFilters} onRemove={remove} />
        {hasFilters(filters) && (
          <Button variant="text" size="small" onClick={onClear}>
            {t('filters.clear')}
          </Button>
        )}
        <div className="ml-auto">{saveSearch}</div>
      </div>
      {open && (
        <FilterDrawer
          key={opening}
          open={open}
          filters={filters}
          onClose={() => {
            setOpen(false);
          }}
          onApply={(change) => {
            onChange(change);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface OptionsProps<T extends string> {
  options: readonly T[];
  selected: T;
  labelOf: (option: T) => string;
  onPick: (option: T) => void;
}

/** A single-choice list inside a pill's popover: picking applies and closes. */
function Options<T extends string>({ options, selected, labelOf, onPick }: OptionsProps<T>) {
  return (
    <MenuList dense autoFocusItem>
      {options.map((option) => (
        <MenuItem
          key={option}
          selected={option === selected}
          onClick={() => {
            onPick(option);
          }}
        >
          {labelOf(option)}
        </MenuItem>
      ))}
    </MenuList>
  );
}

interface PriceFormProps {
  filters: SearchFilters;
  onApply: (change: Change) => void;
  onDone: () => void;
}

/** Min and max in the price pill: typed locally, applied together with the button (or Enter). */
function PriceForm({ filters, onApply, onDone }: PriceFormProps) {
  const { t } = useTranslation('listing');
  const [min, setMin] = useState(filters.priceMin ?? '');
  const [max, setMax] = useState(filters.priceMax ?? '');
  const field = (label: string, value: string, set: (value: string) => void) => (
    <TextField
      size="small"
      label={label}
      value={value}
      onChange={(event) => {
        set(event.target.value.replace(/[^\d]/g, ''));
      }}
      slotProps={{
        htmlInput: { inputMode: 'numeric', maxLength: 9 },
        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
      }}
      className="w-32"
    />
  );
  return (
    <form
      noValidate
      className="flex flex-col gap-3 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        onApply({ priceMin: min || undefined, priceMax: max || undefined });
        onDone();
      }}
    >
      <div className="flex gap-2">
        {field(t('filters.priceMin'), min, setMin)}
        {field(t('filters.priceMax'), max, setMax)}
      </div>
      <div className="flex justify-between gap-2">
        <Button
          variant="text"
          size="small"
          onClick={() => {
            onApply({ priceMin: undefined, priceMax: undefined });
            onDone();
          }}
        >
          {t('filters.clearOne')}
        </Button>
        <Button type="submit" variant="contained" size="small">
          {t('filters.apply')}
        </Button>
      </div>
    </form>
  );
}
