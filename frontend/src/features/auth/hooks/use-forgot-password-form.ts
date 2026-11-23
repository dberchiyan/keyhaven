import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { isApiError } from '@/shared/api/api-error';
import type { ErrorCode } from '@/shared/types';

import { type ForgotPasswordOutput, forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';
import { useRequestPasswordReset } from './use-auth-queries';

export interface UseForgotPasswordFormResult {
    form: UseFormReturn<ForgotPasswordValues, unknown, ForgotPasswordOutput>;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorRef: RefObject<HTMLDivElement | null>;
    sentTo: string | undefined;
    sentRef: RefObject<HTMLDivElement | null>;
}

/**
 * "Forgot password" form state (FORM-1..3). The answer never says whether the address has an
 * account, so success only confirms where a link would go; focus moves to that notice, or to the
 * error line (A11Y-3).
 */
export const useForgotPasswordForm = (): UseForgotPasswordFormResult => {
    const request = useRequestPasswordReset();
    const [sentTo, setSentTo] = useState<string | undefined>(undefined);
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const errorRef = useRef<HTMLDivElement>(null);
    const sentRef = useRef<HTMLDivElement>(null);
    const form = useForm<ForgotPasswordValues, unknown, ForgotPasswordOutput>({
        resolver: zodResolver(forgotPasswordSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: { email: '' },
    });

    useEffect(() => {
        if (errorCode) {
            errorRef.current?.focus();
        }
    }, [errorCode]);
    useEffect(() => {
        if (sentTo) {
            sentRef.current?.focus();
        }
    }, [sentTo]);

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(undefined);
        try {
            await request.mutateAsync(values);
            setSentTo(values.email);
        } catch (error) {
            if (!isApiError(error)) {
                throw error;
            }
            setErrorCode(error.code);
        }
    });

    return { form, onSubmit, errorCode, errorRef, sentTo, sentRef };
};
