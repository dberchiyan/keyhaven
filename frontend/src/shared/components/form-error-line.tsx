import FormHelperText from '@mui/material/FormHelperText';
import type { ReactElement, Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { RESERVED_LINE } from '@/shared/hooks/use-field-message';
import type { ErrorCode } from '@/shared/types';

export interface FormErrorLineProps {
    errorRef: Ref<HTMLDivElement>;
    errorCode: ErrorCode | undefined;
}

/** The form-level error line: reserved, `role="alert"`, focused by the form when it appears. */
export function FormErrorLine({ errorRef, errorCode }: FormErrorLineProps): ReactElement {
    const { t } = useTranslation('errors');
    return (
        <FormHelperText component="div" role="alert" ref={errorRef} tabIndex={-1} error className="m-0 outline-none">
            {errorCode ? t(errorCode) : RESERVED_LINE}
        </FormHelperText>
    );
}
