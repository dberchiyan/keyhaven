import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { ListingFormApi } from '../hooks/use-listing-form';
import { LISTING_KINDS } from '../schemas';
import { ListingFigureFields } from './listing-figure-fields';
import { ListingTextField } from './listing-text-field';

const AMENITY_FLAGS = ['isPetFriendly', 'isFurnished', 'hasParking'] as const;
const DESCRIPTION_MIN_ROWS = 4;

export interface ListingHomeFieldsProps {
    form: ListingFormApi;
}

/**
 * What the home is: rent or sale, the words, the type, price, rooms and size, the move-in day and
 * the amenities. Pets and furnishing are a rental's terms, so a home for sale only says whether
 * it has parking.
 */
export function ListingHomeFields({ form }: ListingHomeFieldsProps): ReactElement {
    const { t } = useTranslation('listing');
    const { control } = form;
    const kind = useWatch({ control, name: 'kind' });
    const isForRent = kind === 'RENT';
    return (
        <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
            <Typography component="legend" variant="h6" className="float-left w-full p-0">
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
                        className="sm:max-w-sm"
                    >
                        {LISTING_KINDS.map((candidate) => (
                            <ToggleButton key={candidate} value={candidate}>
                                {t(`form.kinds.${candidate}`)}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                )}
            />
            <div className="flex flex-col gap-2">
                <ListingTextField form={form} field="title" label={t('form.title')} required />
                <ListingTextField
                    form={form}
                    field="description"
                    label={t('form.description')}
                    required
                    multiline
                    minRows={DESCRIPTION_MIN_ROWS}
                />
                <ListingFigureFields form={form} isForRent={isForRent} />
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
            </div>
        </fieldset>
    );
}
