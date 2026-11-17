import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { useChangePassword } from '@/features/auth';
import { isApiError } from '@/shared/api/api-error';
import type { ErrorCode } from '@/shared/types';

import { changePasswordSchema, type ChangePasswordValues } from '../schemas';

const FIELDS: ReadonlySet<string> = new Set(['currentPassword', 'newPassword', 'confirmPassword']);
const isField = (field: string): field is keyof ChangePasswordValues => FIELDS.has(field);

export interface UseChangePasswordFormResult {
    form: UseFormReturn<ChangePasswordValues>;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorRef: RefObject<HTMLDivElement | null>;
    isDone: boolean;
    doneRef: RefObject<HTMLDivElement | null>;
}

/**
 * Change-password form state (FORM-1..3). Server field errors focus their field (A11Y-4); success
 * clears the form and focuses a notice, because the server has just ended every other session.
 */
export const useChangePasswordForm = (): UseChangePasswordFormResult => {
    const change = useChangePassword();
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const [isDone, setIsDone] = useState(false);
    const errorRef = useRef<HTMLDivElement>(null);
    const doneRef = useRef<HTMLDivElement>(null);
    const form = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    });

    useEffect(() => {
        if (errorCode) {
            errorRef.current?.focus();
        }
    }, [errorCode]);
    useEffect(() => {
        if (isDone) {
            doneRef.current?.focus();
        }
    }, [isDone]);

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(undefined);
        setIsDone(false);
        try {
            await change.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
            form.reset();
            setIsDone(true);
        } catch (caught) {
            if (!isApiError(caught)) {
                throw caught;
            }
            const fieldErrors = caught.details.filter((detail) => isField(detail.field));
            for (const detail of fieldErrors) {
                if (isField(detail.field)) {
                    form.setError(detail.field, { type: 'server', message: detail.message }, { shouldFocus: true });
                }
            }
            if (fieldErrors.length === 0) {
                setErrorCode(caught.code);
            }
        }
    });

    return { form, onSubmit, errorCode, errorRef, isDone, doneRef };
};
