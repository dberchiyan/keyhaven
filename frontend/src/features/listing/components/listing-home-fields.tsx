import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { type ListingFormApi, useListingFieldMessage } from '../hooks/use-listing-form';
import { LISTING_KINDS, PROPERTY_TYPES } from '../schemas';
import { ListingTextField } from './listing-text-field';

const AMENITY_FLAGS = ['isPetFriendly', 'isFurnished', 'hasParking'] as const;
const DESCRIPTION_MIN_ROWS = 4;

export interface ListingHomeFieldsProps {
    form: ListingFormApi;
}

/**
 * What the home is: rent or sale, the words, the type, price, rooms and size, the move-in day and
 * the amenities. Pets and furnishing are a rental's terms, so a home for sale only says whether
 * it has parking. Money is typed as text (FORM-4).
 */
export function ListingHomeFields({ form }: ListingHomeFieldsProps): ReactElement {
    const { t } = useTranslation('listing');
    const { control } = form;
    const messageOf = useListingFieldMessage(form);
    const kind = useWatch({ control, name: 'kind' });
    const isForRent = kind === 'RENT';
    return (
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <Typography component="legend" variant="h6" className="mb-2 p-0">
                {t('form.sections.home')}
            </Typography>
            <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                    <ToggleButtonGroup
                        exclusive
                        fullWidth
                        value={field.value}
                        onChange={(_event, value: string | null) => {
                            if (LISTING_KINDS.some((candidate) => candidate === value)) {
                                field.onChange(value);
                            }
                        }}
                        aria-label={t('form.kind')}
                        className="mb-2 sm:max-w-sm"
                    >
                        {LISTING_KINDS.map((candidate) => (
                            <ToggleButton key={candidate} value={candidate}>
                                {t(`form.kinds.${candidate}`)}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                )}
            />
            <ListingTextField form={form} field="title" label={t('form.title')} required />
            <ListingTextField
                form={form}
                field="description"
                label={t('form.description')}
                required
                multiline
                minRows={DESCRIPTION_MIN_ROWS}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Controller
                    control={control}
                    name="propertyType"
                    render={({ field }) => (
                        <TextField
                            select
                            label={t('form.propertyType')}
                            required
                            fullWidth
                            value={field.value}
                            onChange={field.onChange}
                            error={Boolean(form.formState.errors.propertyType)}
                            helperText={messageOf('propertyType')}
                        >
                            {PROPERTY_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {t(`facts.type.${type}`)}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                />
                <ListingTextField
                    form={form}
                    field="price"
                    label={isForRent ? t('form.rent') : t('form.askingPrice')}
                    required
                    slotProps={{
                        htmlInput: { inputMode: 'decimal' },
                        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                    }}
                />
                <ListingTextField
                    form={form}
                    field="bedrooms"
                    label={t('form.bedrooms')}
                    required
                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
                <ListingTextField
                    form={form}
                    field="bathrooms"
                    label={t('form.bathrooms')}
                    required
                    slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
                <ListingTextField
                    form={form}
                    field="sizeSqft"
                    label={t('form.sizeSqft')}
                    required
                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
                {isForRent && (
                    <ListingTextField
                        form={form}
                        field="availableAt"
                        label={t('form.availableAt')}
                        required
                        type="date"
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                )}
            </div>
            <FormGroup row>
                {AMENITY_FLAGS.filter((flag) => isForRent || flag === 'hasParking').map((flag) => (
                    <Controller
                        key={flag}
                        control={control}
                        name={flag}
                        render={({ field }) => (
                            <FormControlLabel
                                control={<Checkbox checked={field.value} onChange={field.onChange} />}
                                label={t(`form.${flag}`)}
                            />
                        )}
                    />
                ))}
            </FormGroup>
        </fieldset>
    );
}
