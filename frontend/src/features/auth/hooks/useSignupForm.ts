import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
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
    defaultValues: { firstName: '', lastName: '', email: '', password: '', role: 'TENANT' },
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
