import type { FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

export const RESERVED_LINE = ' ';

export interface FieldMessageOptions {
    max?: number;
    min?: number;
    hint?: string;
}

export type FieldMessage = (error: FieldError | string | undefined, options?: FieldMessageOptions) => string;

/**
 * Turns a field's error into its helper text (FORM-2): a `validation:` key from the form schema is
 * translated with its limits, while a server message (FORM-3) has no key and comes back as it
 * arrived — already localised. No error keeps one reserved line, or the hint, so the form never
 * shifts.
 */
export const useFieldMessage = (): FieldMessage => {
    const { t } = useTranslation('validation');
    return (error, { hint, ...values } = {}) => {
        const message = typeof error === 'string' ? error : error?.message;
        if (!message) {
            return hint ?? RESERVED_LINE;
        }
        return t(message, { ...values, defaultValue: message });
    };
};
