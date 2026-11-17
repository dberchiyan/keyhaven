import FormHelperText from '@mui/material/FormHelperText';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import type { ErrorCode } from '@/shared/types';

/** Keeps one line of error space above the submit button, so the form never shifts. */
export const RESERVED_LINE = ' ';

export interface FormErrorLineProps {
    errorRef: Ref<HTMLDivElement>;
    errorCode: ErrorCode | null;
}

/** The form-level error line: reserved, `role="alert"`, focused by the form when it appears. */
export function FormErrorLine({ errorRef, errorCode }: FormErrorLineProps) {
    const { t } = useTranslation('errors');
    return (
        <FormHelperText component="div" role="alert" ref={errorRef} tabIndex={-1} error className="m-0 outline-none">
            {errorCode ? t(errorCode) : RESERVED_LINE}
        </FormHelperText>
    );
}
