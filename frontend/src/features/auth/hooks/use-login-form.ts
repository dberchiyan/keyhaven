import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { isApiError } from '@/shared/api/api-error';
import { applyServerFieldErrors } from '@/shared/lib/server-field-errors';
import type { ErrorCode } from '@/shared/types';

import { type LoginFormOutput, type LoginFormValues, loginSchema } from '../schemas';
import { useLogin } from './use-auth-queries';
import { useLoginParams } from './use-login-params';
import { useLoginRedirect } from './use-login-redirect';

const FORM_FIELDS: ReadonlySet<string> = new Set(['email', 'password']);

export interface UseLoginFormResult {
    form: UseFormReturn<LoginFormValues, unknown, LoginFormOutput>;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorSummaryRef: RefObject<HTMLDivElement | null>;
    isSessionExpired: boolean;
}

/**
 * Sign-in form state (FORM-1..3). The error line is focused once per failed answer — a counter, not
 * the code, so the same code twice still moves focus (A11Y-3); a wrong password clears the field. An address given by
 * the link fills the email and moves focus to the password (A11Y-3).
 */
export const useLoginForm = (): UseLoginFormResult => {
    const navigate = useNavigate();
    const login = useLogin();
    const { target, isSessionExpired } = useLoginRedirect();
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const [serverErrorCount, setServerErrorCount] = useState(0);
    const errorSummaryRef = useRef<HTMLDivElement>(null);
    const { email } = useLoginParams();

    useEffect(() => {
        if (serverErrorCount > 0) {
            errorSummaryRef.current?.focus();
        }
    }, [serverErrorCount]);

    const form = useForm<LoginFormValues, unknown, LoginFormOutput>({
        resolver: zodResolver(loginSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: { email: email ?? '', password: '' },
    });
    const { setFocus } = form;

    useEffect(() => {
        if (email) {
            setFocus('password');
        }
    }, [email, setFocus]);

    const onSubmit = form.handleSubmit(
        async (values) => {
            setErrorCode(undefined);
            try {
                await login.mutateAsync(values);
                await navigate(target, { replace: true });
            } catch (error) {
                if (!isApiError(error)) {
                    throw error;
                }
                applyServerFieldErrors(error, FORM_FIELDS, form.setError);
                if (error.code === 'INVALID_CREDENTIALS') {
                    form.resetField('password', { keepError: false });
                }
                setErrorCode(error.code);
                setServerErrorCount((count) => count + 1);
            }
        },
        () => {
            setErrorCode(undefined);
        },
    );

    return { form, onSubmit, errorCode, errorSummaryRef, isSessionExpired };
};
