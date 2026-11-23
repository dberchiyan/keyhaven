import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { PROPERTY_TYPE_PARAMS } from '@/shared/lib/listing-search';

import type { UseFilterDraftResult } from '../hooks/use-filter-draft';
import { BATH_FILTER_OPTIONS, BED_FILTER_OPTIONS } from '../schemas';
import { FilterAmountField } from './filter-amount-field';
import { FilterSection } from './filter-section';

const AMENITIES = ['isPetFriendly', 'isFurnished', 'hasParking'] as const;

export interface FilterDrawerFieldsProps {
    draft: UseFilterDraftResult['draft'];
    set: UseFilterDraftResult['set'];
    isForRent: boolean;
}

/**
 * The drawer's controls over the draft. Pets, furnishing and the move-in date are a rental's
 * terms, so a search for homes for sale offers parking only. Amenity chips are checkboxes to
 * assistive tech (A11Y-2).
 */
export function FilterDrawerFields({ draft, set, isForRent }: FilterDrawerFieldsProps): ReactElement {
    const { t } = useTranslation('listing');
    return (
        <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-5 py-3">
            <FilterSection title={isForRent ? t('filters.rent') : t('filters.price')}>
                <div className="flex gap-4">
                    <FilterAmountField
                        label={t('filters.priceMin')}
                        value={draft.priceMin ?? ''}
                        onChange={(digits) => {
                            set('priceMin', digits || undefined);
                        }}
                        className="flex-1"
                    />
                    <FilterAmountField
                        label={t('filters.priceMax')}
                        value={draft.priceMax ?? ''}
                        onChange={(digits) => {
                            set('priceMax', digits || undefined);
                        }}
                        className="flex-1"
                    />
                </div>
            </FilterSection>
            <FilterSection title={t('filters.type')}>
                <TextField
                    select
                    size="small"
                    value={draft.type ?? ''}
                    onChange={(event) => {
                        set(
                            'type',
                            PROPERTY_TYPE_PARAMS.find((candidate) => candidate === event.target.value),
                        );
                    }}
                    slotProps={{ select: { displayEmpty: true, 'aria-label': t('filters.type') } }}
                >
                    <MenuItem value="">{t('filters.anyType')}</MenuItem>
                    {PROPERTY_TYPE_PARAMS.map((type) => (
                        <MenuItem key={type} value={type}>
                            {t(`facts.type.${type}`)}
                        </MenuItem>
                    ))}
                </TextField>
            </FilterSection>
            <FilterSection title={t('filters.beds')}>
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
                    {BED_FILTER_OPTIONS.map((option) => (
                        <ToggleButton key={option} value={option}>
                            {t('filters.bedsOption', { count: Number(option) })}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </FilterSection>
            <FilterSection title={t('filters.baths')}>
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
                    {BATH_FILTER_OPTIONS.map((option) => (
                        <ToggleButton key={option} value={option}>
                            {t('filters.bathsOption', { count: option })}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </FilterSection>
            <FilterSection title={t('filters.amenities')}>
                <div role="group" aria-label={t('filters.amenities')} className="flex flex-wrap gap-2">
                    {AMENITIES.filter((key) => isForRent || key === 'hasParking').map((key) => (
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
                </div>
            </FilterSection>
            {isForRent && (
                <FilterSection title={t('filters.moveInOn')}>
                    <TextField
                        type="date"
                        size="small"
                        label={t('filters.moveInOnLabel')}
                        value={draft.moveInOn ?? ''}
                        onChange={(event) => {
                            set('moveInOn', event.target.value || undefined);
                        }}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                </FilterSection>
            )}
        </div>
    );
}
