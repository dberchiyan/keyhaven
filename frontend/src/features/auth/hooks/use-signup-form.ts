import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';

import { isApiError } from '@/shared/api/api-error';
import { PATHS } from '@/shared/lib/paths';
import { applyServerFieldErrors } from '@/shared/lib/server-field-errors';
import type { ErrorCode } from '@/shared/types';

import { type SignupOutput, signupSchema, type SignupValues } from '../schemas';
import { useRegister } from './use-auth-queries';

const FIELDS: ReadonlySet<string> = new Set(['firstName', 'lastName', 'email', 'password', 'role']);

export interface UseSignupFormResult {
    form: UseFormReturn<SignupValues, unknown, SignupOutput>;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorRef: RefObject<HTMLDivElement | null>;
}

/**
 * Sign-up form state (FORM-1..3); `?role=landlord` from the landing preselects the role, and the
 * answer signs the person in, so success opens the app.
 */
export const useSignupForm = (): UseSignupFormResult => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialRole = searchParams.get('role') === 'landlord' ? 'LANDLORD' : 'TENANT';
    const register = useRegister();
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (errorCode) {
            errorRef.current?.focus();
        }
    }, [errorCode]);

    const form = useForm<SignupValues, unknown, SignupOutput>({
        resolver: zodResolver(signupSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: { firstName: '', lastName: '', email: '', password: '', role: initialRole },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(undefined);
        try {
            await register.mutateAsync(values);
            await navigate(PATHS.home, { replace: true });
        } catch (error) {
            if (!isApiError(error)) {
                throw error;
            }
            if (!applyServerFieldErrors(error, FIELDS, form.setError)) {
                setErrorCode(error.code);
            }
        }
    });

    return { form, onSubmit, errorCode, errorRef };
};
