import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { isApiError } from '@/shared/api/apiError';
import { PATHS } from '@/shared/lib/paths';
import type { ErrorCode } from '@/shared/types';
import { type SignupOutput, type SignupValues, signupSchema } from '../schemas';
import { useRegister } from './useAccountRecovery';
import { applyServerFieldErrors } from './useServerFieldErrors';

const FIELDS: ReadonlySet<string> = new Set(['firstName', 'lastName', 'email', 'password', 'role']);

/** Sign-up form state: validation, submit, server errors; success opens the app signed in. */
export const useSignupForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // "List your home" on the landing opens sign-up with the landlord role picked.
    const initialRole = searchParams.get('role') === 'landlord' ? 'LANDLORD' : 'TENANT';
    const register = useRegister();
    const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
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
        setErrorCode(null);
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
