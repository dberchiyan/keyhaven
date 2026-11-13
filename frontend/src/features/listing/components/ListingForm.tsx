import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ComponentProps } from 'react';
import { Controller, type FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { FormErrorLine, RESERVED_LINE } from '@/features/auth';
import { useCities } from '../hooks/useListingQueries';
import { useListingForm } from '../hooks/useListingForm';
import {
  isListingValidationMessage,
  LISTING_LIMITS,
  type ListingFormValues,
  PROPERTY_TYPES,
} from '../schemas';
import type { ManagedListing } from '../types';

export interface ListingFormProps {
  /** Null = a new listing. */
  listing: ManagedListing | null;
  cancelTo: string;
}

const LIMIT_OF: Partial<Record<keyof ListingFormValues, number>> = {
  title: LISTING_LIMITS.title,
  description: LISTING_LIMITS.description,
  addressLine1: LISTING_LIMITS.addressLine1,
  addressLine2: LISTING_LIMITS.addressLine2,
  neighborhood: LISTING_LIMITS.neighborhood,
};

/** The listing's details — one form for creating and editing; photos are managed on its page. */
export function ListingForm({ listing, cancelTo }: ListingFormProps) {
  const { t } = useTranslation(['listing', 'validation']);
  const { form, onSubmit, errorCode, errorRef, isEditing } = useListingForm(listing);
  const { register, control, formState } = form;
  const { errors, isSubmitting } = formState;
  const cities = useCities();

  const message = (field: keyof ListingFormValues, error: FieldError | undefined): string =>
    error?.message
      ? isListingValidationMessage(error.message)
        ? t(error.message, { max: LIMIT_OF[field] ?? 0 })
        : error.message
      : RESERVED_LINE;

  const text = (
    field: keyof ListingFormValues,
    label: string,
    extra: Partial<ComponentProps<typeof TextField>> = {},
  ) => (
    <TextField
      {...register(field)}
      label={label}
      fullWidth
      error={Boolean(errors[field])}
      helperText={message(field, errors[field])}
      {...extra}
    />
  );

  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={(event) => void onSubmit(event)}>
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <Typography component="legend" variant="h6" className="mb-2 p-0">
          {t('listing:form.sections.home')}
        </Typography>
        {text('title', t('listing:form.title'), { required: true })}
        {text('description', t('listing:form.description'), {
          required: true,
          multiline: true,
          minRows: 4,
        })}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Controller
            control={control}
            name="propertyType"
            render={({ field }) => (
              <TextField
                select
                label={t('listing:form.propertyType')}
                required
                fullWidth
                value={field.value}
                onChange={field.onChange}
                error={Boolean(errors.propertyType)}
                helperText={message('propertyType', errors.propertyType)}
              >
                {PROPERTY_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {t(`listing:facts.type.${type}`)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          {text('rent', t('listing:form.rent'), {
            required: true,
            slotProps: {
              htmlInput: { inputMode: 'decimal' },
              input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
            },
          })}
          {text('bedrooms', t('listing:form.bedrooms'), {
            required: true,
            slotProps: { htmlInput: { inputMode: 'numeric' } },
          })}
          {text('bathrooms', t('listing:form.bathrooms'), {
            required: true,
            slotProps: { htmlInput: { inputMode: 'decimal' } },
          })}
          {text('sizeSqft', t('listing:form.sizeSqft'), {
            required: true,
            slotProps: { htmlInput: { inputMode: 'numeric' } },
          })}
          {text('availableFrom', t('listing:form.availableFrom'), {
            required: true,
            type: 'date',
            slotProps: { inputLabel: { shrink: true } },
          })}
        </div>
        <FormGroup row>
          {(['petsAllowed', 'furnished', 'parking'] as const).map((flag) => (
            <Controller
              key={flag}
              control={control}
              name={flag}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={field.onChange} />}
                  label={t(`listing:form.${flag}`)}
                />
              )}
            />
          ))}
        </FormGroup>
      </fieldset>
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <Typography component="legend" variant="h6" className="mb-2 p-0">
          {t('listing:form.sections.address')}
        </Typography>
        <Typography variant="body2" color="textSecondary" className="mb-2">
          {t('listing:form.addressHint')}
        </Typography>
        {text('addressLine1', t('listing:form.addressLine1'), {
          required: true,
          autoComplete: 'address-line1',
        })}
        {text('addressLine2', t('listing:form.addressLine2'), { autoComplete: 'address-line2' })}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Controller
            control={control}
            name="cityId"
            render={({ field }) => (
              <TextField
                select
                label={t('listing:form.city')}
                required
                fullWidth
                value={cities.data?.some((city) => city.id === field.value) ? field.value : ''}
                onChange={field.onChange}
                error={Boolean(errors.cityId)}
                helperText={message('cityId', errors.cityId)}
              >
                {(cities.data ?? []).map((city) => (
                  <MenuItem key={city.id} value={city.id}>
                    {`${city.name}, ${city.state}`}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          {text('neighborhood', t('listing:form.neighborhood'))}
          {text('zip', t('listing:form.zip'), {
            required: true,
            autoComplete: 'postal-code',
            slotProps: { htmlInput: { inputMode: 'numeric', maxLength: LISTING_LIMITS.zip } },
          })}
        </div>
      </fieldset>
      <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button component={RouterLink} to={cancelTo} variant="text">
          {t('listing:form.cancel')}
        </Button>
        <Button type="submit" variant="contained" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isEditing ? t('listing:form.save') : t('listing:form.create')}
        </Button>
      </div>
    </form>
  );
}
