import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import type { ReactElement } from 'react';

import { PRICE_FILTER_MAX_DIGITS } from '../schemas';

export interface FilterAmountFieldProps {
    label: string;
    value: string;
    onChange: (digits: string) => void;
    className?: string;
}

/**
 * A whole-dollar price bound: digits only, kept as text so the amount never becomes a float
 * (QRY-20, FORM-4), within the URL schema's nine digits.
 */
export function FilterAmountField({ label, value, onChange, className }: FilterAmountFieldProps): ReactElement {
    return (
        <TextField
            size="small"
            label={label}
            value={value}
            onChange={(event) => {
                onChange(event.target.value.replace(/[^\d]/g, ''));
            }}
            slotProps={{
                htmlInput: { inputMode: 'numeric', maxLength: PRICE_FILTER_MAX_DIGITS },
                input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
            }}
            className={className}
        />
    );
}
