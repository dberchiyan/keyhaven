import Button from '@mui/material/Button';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { FormErrorLine } from '@/shared/components/form-error-line';

import { useListingForm } from '../hooks/use-listing-form';
import type { ManagedListing } from '../types';
import { ListingAddressFields } from './listing-address-fields';
import { ListingHomeFields } from './listing-home-fields';

export interface ListingFormProps {
    listing: ManagedListing | undefined;
    cancelTo: string;
}

/**
 * The listing's details — one form for creating (no listing) and editing; photos are managed on
 * the listing's page, because an upload needs the listing to exist.
 */
export function ListingForm({ listing, cancelTo }: ListingFormProps): ReactElement {
    const { t } = useTranslation('listing');
    const { form, onSubmit, errorCode, errorRef, isEditing } = useListingForm(listing);
    const { isSubmitting } = form.formState;
    return (
        <form noValidate className="flex flex-col gap-6" onSubmit={(event) => void onSubmit(event)}>
            <ListingHomeFields form={form} />
            <ListingAddressFields form={form} />
            <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button component={RouterLink} to={cancelTo} variant="text">
                    {t('form.cancel')}
                </Button>
                <Button type="submit" variant="contained" disabled={isSubmitting} aria-busy={isSubmitting}>
                    {isEditing ? t('form.save') : t('form.create')}
                </Button>
            </div>
        </form>
    );
}
