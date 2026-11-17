import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { useEraseAccount } from '@/features/auth';
import { isApiError } from '@/shared/api/api-error';
import { applyServerFieldErrors } from '@/shared/lib/server-field-errors';
import type { ErrorCode } from '@/shared/types';

import { eraseAccountSchema, type EraseAccountValues } from '../schemas';

const SERVER_FIELDS: ReadonlySet<string> = new Set(['password']);

export interface UseEraseAccountFormResult {
    form: UseFormReturn<EraseAccountValues>;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorRef: RefObject<HTMLDivElement | null>;
}

/**
 * The password step of erasing one's account (FORM-1..3, FORM-5): one request at the end; a wrong
 * password lands on the field and focuses it, anything else on the reserved error line. Success
 * leaves the app (the mutation clears the cache and loads `/`).
 */
export const useEraseAccountForm = (): UseEraseAccountFormResult => {
    const erase = useEraseAccount();
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const errorRef = useRef<HTMLDivElement>(null);
    const form = useForm<EraseAccountValues>({
        resolver: zodResolver(eraseAccountSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: { password: '' },
    });

    useEffect(() => {
        if (errorCode) {
            errorRef.current?.focus();
        }
    }, [errorCode]);

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(undefined);
        try {
            await erase.mutateAsync({ password: values.password });
        } catch (caught) {
            if (!isApiError(caught)) {
                throw caught;
            }
            if (applyServerFieldErrors(caught, SERVER_FIELDS, form.setError)) {
                form.setFocus('password');
                return;
            }
            setErrorCode(caught.code);
        }
    });

    return { form, onSubmit, errorCode, errorRef };
};
