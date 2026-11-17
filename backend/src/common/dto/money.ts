import { z } from 'zod';

import { AMOUNT_INPUT_MAX_LENGTH, CURRENCY_CODE_LENGTH } from './limits';

export const MoneySchema = z
    .object({
        amount: z.string().regex(/^-?\d{1,15}\.\d{4}$/),
        currency: z.string().length(CURRENCY_CODE_LENGTH),
    })
    .meta({ id: 'Money' });

export const AmountInputSchema = z
    .string()
    .trim()
    .max(AMOUNT_INPUT_MAX_LENGTH, 'validation.amount.invalid')
    .regex(/^\d{1,13}(\.\d{1,2})?$/, 'validation.amount.invalid')
    .refine((value) => /[1-9]/.test(value), 'validation.amount.invalid');
