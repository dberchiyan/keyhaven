import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { isApiError } from '@/shared/api/api-error';
import { PATHS } from '@/shared/lib/paths';
import type { ErrorCode } from '@/shared/types';

import { type ResetPasswordOutput, resetPasswordSchema, type ResetPasswordValues } from '../schemas';
import { useResetPassword } from './use-account-recovery';

export interface UseResetPasswordFormResult {
    form: UseFormReturn<ResetPasswordValues, unknown, ResetPasswordOutput>;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorRef: RefObject<HTMLDivElement | null>;
}

/**
 * New-password form state (FORM-1..3): the repeat is checked on the client only, and the answer
 * signs this browser in, so success opens the app.
 */
export const useResetPasswordForm = (token: string): UseResetPasswordFormResult => {
    const navigate = useNavigate();
    const reset = useResetPassword();
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const errorRef = useRef<HTMLDivElement>(null);
    const form = useForm<ResetPasswordValues, unknown, ResetPasswordOutput>({
        resolver: zodResolver(resetPasswordSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: { newPassword: '', confirmPassword: '' },
    });

    useEffect(() => {
        if (errorCode) {
            errorRef.current?.focus();
        }
    }, [errorCode]);

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(undefined);
        try {
            await reset.mutateAsync({ token, newPassword: values.newPassword });
            await navigate(PATHS.home, { replace: true });
        } catch (error) {
            if (!isApiError(error)) {
                throw error;
            }
            setErrorCode(error.code);
        }
    });

    return { form, onSubmit, errorCode, errorRef };
};
