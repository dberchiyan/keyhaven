import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import { useCities } from '../hooks/useListingQueries';

/** Typing pauses this long before the text goes to the URL (and the API). */
const SEARCH_DEBOUNCE_MS = 350;
const ALL = '';
const BEDS = ['', '0', '1', '2', '3', '4'] as const;
const BATHS = ['', '1', '1.5', '2', '3'] as const;

type Change = Partial<Omit<BrowseParams, 'size' | 'page'>>;

export interface FilterBarProps {
  params: BrowseParams;
  total: number | undefined;
  onChange: (change: Change) => void;
  onClear: () => void;
  /** The "Save this search" control, when the role has it. */
  saveSearch?: ReactNode;
}

/** Every filter of the search page; each change goes to the URL at once (text after a pause). */
export function FilterBar({ params, total, onChange, onClear, saveSearch }: FilterBarProps) {
  const { t, i18n } = useTranslation('listing');
  const cities = useCities();
  const city = cities.data?.some((candidate) => candidate.slug === params.city)
    ? (params.city ?? ALL)
    : ALL;

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

  const amenity = (key: 'pets' | 'furnished' | 'parking') => (
    <Chip
      key={key}
      label={t(`filters.${key}`)}
      variant={params[key] ? 'filled' : 'outlined'}
      color={params[key] ? 'primary' : 'default'}
      clickable
      role="checkbox"
      aria-checked={params[key] === true}
      onClick={() => {
        onChange({ [key]: params[key] ? undefined : true });
      }}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <TextField
        type="search"
        size="small"
        label={t('filters.search')}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
        slotProps={{
          htmlInput: { maxLength: SEARCH_TEXT_MAX_LENGTH, autoComplete: 'off', spellCheck: false },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined aria-hidden />
              </InputAdornment>
            ),
          },
        }}
        className="w-full md:max-w-lg"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <TextField
          select
          size="small"
          label={t('browse.city')}
          value={city}
          onChange={(event) => {
            onChange({ city: event.target.value === ALL ? undefined : event.target.value });
          }}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          className="col-span-2 sm:col-span-1"
        >
          <MenuItem value={ALL}>{t('browse.allCities')}</MenuItem>
          {(cities.data ?? []).map((option) => (
            <MenuItem key={option.id} value={option.slug}>
              {`${option.name}, ${option.state}`}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label={t('filters.rentMin')}
          value={params.rentMin ?? ''}
          onChange={(event) => {
            onChange({ rentMin: event.target.value.replace(/[^\d]/g, '') || undefined });
          }}
          slotProps={{
            htmlInput: { inputMode: 'numeric', maxLength: 9 },
            input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
          }}
        />
        <TextField
          size="small"
          label={t('filters.rentMax')}
          value={params.rentMax ?? ''}
          onChange={(event) => {
            onChange({ rentMax: event.target.value.replace(/[^\d]/g, '') || undefined });
          }}
          slotProps={{
            htmlInput: { inputMode: 'numeric', maxLength: 9 },
            input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
          }}
        />
        <TextField
          select
          size="small"
          label={t('filters.beds')}
          value={params.beds === undefined ? '' : String(params.beds)}
          onChange={(event) => {
            onChange({ beds: event.target.value === '' ? undefined : Number(event.target.value) });
          }}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          {BEDS.map((option) => (
            <MenuItem key={option} value={option}>
              {option === ''
                ? t('filters.any')
                : t('filters.bedsOption', { count: Number(option) })}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('filters.baths')}
          value={params.baths ?? ''}
          onChange={(event) => {
            onChange({ baths: event.target.value === '' ? undefined : event.target.value });
          }}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          {BATHS.map((option) => (
            <MenuItem key={option} value={option}>
              {option === '' ? t('filters.any') : t('filters.bathsOption', { count: option })}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          size="small"
          label={t('filters.availableBy')}
          value={params.availableBy ?? ''}
          onChange={(event) => {
            onChange({ availableBy: event.target.value || undefined });
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t('filters.amenities')} className="flex flex-wrap gap-2">
          {amenity('pets')}
          {amenity('furnished')}
          {amenity('parking')}
        </div>
        <TextField
          select
          size="small"
          label={t('browse.sort')}
          value={params.sort}
          onChange={(event) => {
            const sort = BROWSE_SORTS.find((candidate) => candidate === event.target.value);
            if (sort) {
              onChange({ sort });
            }
          }}
          className="w-44 sm:ml-auto"
        >
          {BROWSE_SORTS.map((option) => (
            <MenuItem key={option} value={option}>
              {t(`browse.sortOptions.${option}`)}
            </MenuItem>
          ))}
        </TextField>
      </div>
      <div className="flex flex-wrap items-center gap-3">
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
        {hasFilters(filtersOf(params)) && (
          <Button variant="text" size="small" onClick={onClear}>
            {t('filters.clear')}
          </Button>
        )}
        <div className="ml-auto">{saveSearch}</div>
      </div>
    </div>
  );
}
