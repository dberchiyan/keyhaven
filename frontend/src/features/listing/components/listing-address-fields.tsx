import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { type ListingFormApi, useListingFieldMessage } from '../hooks/use-listing-form';
import { useCities } from '../hooks/use-listing-queries';
import { LISTING_LIMITS } from '../schemas';
import { ListingTextField } from './listing-text-field';

export interface ListingAddressFieldsProps {
    form: ListingFormApi;
}

/**
 * Where the home is. The city select shows nothing until the cities arrive, so a stored id never
 * renders as an out-of-range value.
 */
export function ListingAddressFields({ form }: ListingAddressFieldsProps): ReactElement {
    const { t } = useTranslation('listing');
    const cities = useCities();
    const messageOf = useListingFieldMessage(form);
    return (
        <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
            <Typography component="legend" variant="h6" className="float-left w-full p-0">
                {t('form.sections.address')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
                {t('form.addressHint')}
            </Typography>
            <div className="flex flex-col gap-2">
                <ListingTextField
                    form={form}
                    field="addressLine1"
                    label={t('form.addressLine1')}
                    required
                    autoComplete="address-line1"
                />
                <ListingTextField
                    form={form}
                    field="addressLine2"
                    label={t('form.addressLine2')}
                    autoComplete="address-line2"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Controller
                        control={form.control}
                        name="cityId"
                        render={({ field }) => (
                            <TextField
                                select
                                label={t('form.city')}
                                required
                                fullWidth
                                value={cities.data?.some((city) => city.id === field.value) ? field.value : ''}
                                onChange={field.onChange}
                                error={Boolean(form.formState.errors.cityId)}
                                helperText={messageOf('cityId')}
                            >
                                {(cities.data ?? []).map((city) => (
                                    <MenuItem key={city.id} value={city.id}>
                                        {`${city.name}, ${city.state}`}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    />
                    <ListingTextField form={form} field="neighborhood" label={t('form.neighborhood')} />
                    <ListingTextField
                        form={form}
                        field="zip"
                        label={t('form.zip')}
                        required
                        autoComplete="postal-code"
                        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: LISTING_LIMITS.zip } }}
                    />
                </div>
            </div>
        </fieldset>
    );
}
