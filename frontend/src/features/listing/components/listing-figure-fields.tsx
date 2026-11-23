import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { ReactElement } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { type ListingFormApi, useListingFieldMessage } from '../hooks/use-listing-form';
import { PROPERTY_TYPES } from '../schemas';
import { ListingTextField } from './listing-text-field';

export interface ListingFigureFieldsProps {
    form: ListingFormApi;
    isForRent: boolean;
}

/** The home's figures: type, price, rooms, size and, for a rental, the move-in day. Money is typed as text (FORM-4). */
export function ListingFigureFields({ form, isForRent }: ListingFigureFieldsProps): ReactElement {
    const { t } = useTranslation('listing');
    const messageOf = useListingFieldMessage(form);
    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Controller
                control={form.control}
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
                    field="availableOn"
                    label={t('form.availableOn')}
                    required
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                />
            )}
        </div>
    );
}
