import CloseOutlined from '@mui/icons-material/CloseOutlined';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchFilters } from '@/shared/lib/listingSearch';
import { type DrawerChange, useFilterDraft } from '../hooks/useFilterDraft';

const BEDS = ['0', '1', '2', '3', '4'] as const;
const BATHS = ['1', '1.5', '2', '3'] as const;
const AMENITIES = ['pets', 'furnished', 'parking'] as const;

export interface FilterDrawerProps {
  open: boolean;
  filters: SearchFilters;
  onClose: () => void;
  onApply: (change: DrawerChange) => void;
}

/** The detailed filters in a side sheet (a bottom sheet on a phone); applied together. */
export function FilterDrawer({ open, filters, onClose, onApply }: FilterDrawerProps) {
  const { t, i18n } = useTranslation('listing');
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();
  const { draft, set, clear, change, count, counting } = useFilterDraft(filters, open);

  const amount = (key: 'rentMin' | 'rentMax', label: string) => (
    <TextField
      size="small"
      label={label}
      value={draft[key] ?? ''}
      onChange={(event) => {
        set(key, event.target.value.replace(/[^\d]/g, '') || undefined);
      }}
      slotProps={{
        htmlInput: { inputMode: 'numeric', maxLength: 9 },
        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
      }}
      className="flex-1"
    />
  );

  const section = (title: string, content: ReactNode) => (
    <div className="flex flex-col gap-2">
      <Typography variant="subtitle2" component="h3">
        {title}
      </Typography>
      {content}
    </div>
  );

  return (
    <Drawer
      anchor={isPhone ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      slotProps={{
        paper: {
          className: isPhone
            ? 'max-h-[85dvh] rounded-t-xl border-0'
            : 'w-full max-w-md border-0 border-l border-divider',
        },
      }}
    >
      {/* max-h in dvh above: the bottom sheet leaves the page's top visible on a phone. */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <Typography id={titleId} variant="h6" component="h2">
          {t('filters.title')}
        </Typography>
        <IconButton aria-label={t('filters.close')} onClick={onClose} edge="end">
          <CloseOutlined aria-hidden />
        </IconButton>
      </div>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-3">
        {section(
          t('filters.rent'),
          <div className="flex gap-3">
            {amount('rentMin', t('filters.rentMin'))}
            {amount('rentMax', t('filters.rentMax'))}
          </div>,
        )}
        {section(
          t('filters.beds'),
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={draft.beds === undefined ? '' : String(draft.beds)}
            onChange={(_event, value: string | null) => {
              set('beds', value === null || value === '' ? undefined : Number(value));
            }}
            aria-label={t('filters.beds')}
          >
            <ToggleButton value="">{t('filters.any')}</ToggleButton>
            {BEDS.map((option) => (
              <ToggleButton key={option} value={option}>
                {t('filters.bedsOption', { count: Number(option) })}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>,
        )}
        {section(
          t('filters.baths'),
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={draft.baths ?? ''}
            onChange={(_event, value: string | null) => {
              set('baths', value === null || value === '' ? undefined : value);
            }}
            aria-label={t('filters.baths')}
          >
            <ToggleButton value="">{t('filters.any')}</ToggleButton>
            {BATHS.map((option) => (
              <ToggleButton key={option} value={option}>
                {t('filters.bathsOption', { count: option })}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>,
        )}
        {section(
          t('filters.amenities'),
          <div role="group" aria-label={t('filters.amenities')} className="flex flex-wrap gap-2">
            {AMENITIES.map((key) => (
              <Chip
                key={key}
                label={t(`filters.${key}`)}
                variant={draft[key] ? 'filled' : 'outlined'}
                color={draft[key] ? 'primary' : 'default'}
                clickable
                role="checkbox"
                aria-checked={draft[key] === true}
                onClick={() => {
                  set(key, draft[key] ? undefined : true);
                }}
              />
            ))}
          </div>,
        )}
        {section(
          t('filters.availableBy'),
          <TextField
            type="date"
            size="small"
            label={t('filters.availableByLabel')}
            value={draft.availableBy ?? ''}
            onChange={(event) => {
              set('availableBy', event.target.value || undefined);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />,
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-divider px-5 py-3">
        <Button variant="text" onClick={clear}>
          {t('filters.clearAll')}
        </Button>
        <Button
          variant="contained"
          aria-busy={counting}
          onClick={() => {
            onApply(change());
          }}
        >
          {count === undefined
            ? t('filters.show')
            : t('filters.showCount', {
                count,
                formatted: new Intl.NumberFormat(i18n.language).format(count),
              })}
        </Button>
      </div>
    </Drawer>
  );
}
