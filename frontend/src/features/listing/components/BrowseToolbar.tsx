import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { BROWSE_SORTS } from '../hooks/useBrowseParams';
import { useCities } from '../hooks/useListingQueries';
import type { BrowseParams } from '../types';

const ALL_CITIES = '';

export interface BrowseToolbarProps {
  params: BrowseParams;
  /** Matching homes; absent while the first page loads. */
  total: number | undefined;
  onChange: (change: Partial<Pick<BrowseParams, 'city' | 'sort'>>) => void;
}

/** City and sort (both in the URL) and how many homes match. */
export function BrowseToolbar({ params, total, onChange }: BrowseToolbarProps) {
  const { t, i18n } = useTranslation('listing');
  const cities = useCities();
  // An unknown slug in the URL shows as "All cities" rather than an empty select.
  const city = cities.data?.some((candidate) => candidate.slug === params.city)
    ? (params.city ?? ALL_CITIES)
    : ALL_CITIES;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <TextField
        select
        size="small"
        label={t('browse.city')}
        value={city}
        onChange={(event) => {
          onChange({ city: event.target.value === ALL_CITIES ? undefined : event.target.value });
        }}
        // "All cities" is a real choice, shown as the value rather than an empty field.
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        className="w-full sm:w-56"
      >
        <MenuItem value={ALL_CITIES}>{t('browse.allCities')}</MenuItem>
        {(cities.data ?? []).map((option) => (
          <MenuItem key={option.id} value={option.slug}>
            {`${option.name}, ${option.state}`}
          </MenuItem>
        ))}
      </TextField>
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
        className="w-full sm:w-56"
      >
        {BROWSE_SORTS.map((option) => (
          <MenuItem key={option} value={option}>
            {t(`browse.sortOptions.${option}`)}
          </MenuItem>
        ))}
      </TextField>
      <Typography
        variant="body2"
        color="textSecondary"
        role="status"
        className="app-tabular whitespace-nowrap sm:ml-auto"
      >
        {total === undefined
          ? ''
          : t('browse.count', {
              count: total,
              formatted: new Intl.NumberFormat(i18n.language).format(total),
            })}
      </Typography>
    </div>
  );
}
