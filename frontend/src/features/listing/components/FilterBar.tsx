import SearchOutlined from '@mui/icons-material/SearchOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BROWSE_SORTS,
  type BrowseParams,
  filtersOf,
  hasFilters,
  SEARCH_TEXT_MAX_LENGTH,
} from '@/shared/lib/listingSearch';
import { countDrawerFilters, type DrawerKey } from '../hooks/useFilterDraft';
import { useCities } from '../hooks/useListingQueries';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterDrawer } from './FilterDrawer';

/** Typing pauses this long before the text goes to the URL (and the API). */
const SEARCH_DEBOUNCE_MS = 350;
const ALL = '';

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
 * One quiet row — the search text, the city, a Filters button and the sort — with the detailed
 * filters behind the button in a drawer. Active filters come back as removable chips.
 */
export function FilterBar({ params, total, onChange, onClear, saveSearch }: FilterBarProps) {
  const { t, i18n } = useTranslation('listing');
  const cities = useCities();
  const city = cities.data?.some((candidate) => candidate.slug === params.city)
    ? (params.city ?? ALL)
    : ALL;
  const filters = filtersOf(params);
  const active = countDrawerFilters(filters);

  // The drawer remounts on each opening (its draft starts from the URL every time).
  const [opening, setOpening] = useState(0);
  const [open, setOpen] = useState(false);

  // The URL is the source of truth: a Back navigation puts its text back into the field.
  const [text, setText] = useState(params.q ?? '');
  const [urlText, setUrlText] = useState(params.q ?? '');
  if ((params.q ?? '') !== urlText) {
    setUrlText(params.q ?? '');
    setText(params.q ?? '');
  }
  useEffect(() => {
    if (text === (params.q ?? '')) {
      return undefined;
    }
    const timer = setTimeout(() => {
      onChange({ q: text.trim() === '' ? undefined : text.trim() });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, params.q, onChange]);

  const remove = (keys: readonly DrawerKey[]): void => {
    onChange(Object.fromEntries(keys.map((key) => [key, undefined])));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <TextField
          type="search"
          size="small"
          placeholder={t('filters.search')}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          slotProps={{
            htmlInput: {
              'aria-label': t('filters.search'),
              maxLength: SEARCH_TEXT_MAX_LENGTH,
              autoComplete: 'off',
              spellCheck: false,
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined aria-hidden />
                </InputAdornment>
              ),
            },
          }}
          className="w-full md:max-w-md md:flex-1"
        />
        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          <TextField
            select
            size="small"
            value={city}
            onChange={(event) => {
              onChange({ city: event.target.value === ALL ? undefined : event.target.value });
            }}
            slotProps={{
              select: { displayEmpty: true, 'aria-label': t('browse.city') },
            }}
            className="w-44"
          >
            <MenuItem value={ALL}>{t('browse.allCities')}</MenuItem>
            {(cities.data ?? []).map((option) => (
              <MenuItem key={option.id} value={option.slug}>
                {`${option.name}, ${option.state}`}
              </MenuItem>
            ))}
          </TextField>
          <Badge badgeContent={active} color="primary" overlap="rectangular">
            <Button
              variant="outlined"
              startIcon={<TuneOutlined aria-hidden />}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={
                active > 0 ? t('filters.openActive', { count: active }) : t('filters.open')
              }
              onClick={() => {
                setOpening((count) => count + 1);
                setOpen(true);
              }}
            >
              {t('filters.open')}
            </Button>
          </Badge>
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
            className="w-44"
          >
            {BROWSE_SORTS.map((option) => (
              <MenuItem key={option} value={option}>
                {t(`browse.sortOptions.${option}`)}
              </MenuItem>
            ))}
          </TextField>
        </div>
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
        <ActiveFilterChips filters={filters} onRemove={remove} />
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
