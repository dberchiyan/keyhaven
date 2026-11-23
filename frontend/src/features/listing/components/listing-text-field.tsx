import TextField, { type TextFieldProps } from '@mui/material/TextField';
import type { ReactElement } from 'react';

import { type ListingFormApi, useListingFieldMessage } from '../hooks/use-listing-form';
import type { ListingFormValues } from '../schemas';

export interface ListingTextFieldProps extends Omit<TextFieldProps, 'name' | 'error' | 'helperText'> {
    form: ListingFormApi;
    field: keyof ListingFormValues;
}

/** One text field of the listing form, registered, with its reserved helper line (FORM-2). */
export function ListingTextField({ form, field, ...props }: ListingTextFieldProps): ReactElement {
    const messageOf = useListingFieldMessage(form);
    return (
        <TextField
            {...form.register(field)}
            fullWidth
            error={Boolean(form.formState.errors[field])}
            helperText={messageOf(field)}
            {...props}
        />
    );
}
