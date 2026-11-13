import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@mui/material/Button';
import { useEffect, useId, useRef, useState } from 'react';
import { type FieldError, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { isApiError } from '@/shared/api/apiError';
import { PasswordField } from '@/shared/components/PasswordField';
import { PasswordRules } from '@/shared/components/PasswordRules';
import { PASSWORD_LIMITS } from '@/shared/lib/passwordRules';
import { PATHS } from '@/shared/lib/paths';
import type { ErrorCode } from '@/shared/types';
import { useResetPassword } from '../hooks/useAccountRecovery';
import {
  type ResetPasswordOutput,
  type ResetPasswordValues,
  resetPasswordSchema,
} from '../schemas';
import { FormErrorLine, RESERVED_LINE } from './FormErrorLine';

export interface ResetPasswordFormProps {
  token: string;
}

/** A new password twice; saving signs this browser in and opens the app. */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const { t } = useTranslation(['auth', 'validation']);
  const navigate = useNavigate();
  const reset = useResetPassword();
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const rulesId = useId();
  const form = useForm<ResetPasswordValues, unknown, ResetPasswordOutput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  const { errors, isSubmitting } = form.formState;
  const [newPassword, confirmPassword] = useWatch({
    control: form.control,
    name: ['newPassword', 'confirmPassword'],
  });

  useEffect(() => {
    if (errorCode) {
      errorRef.current?.focus();
    }
  }, [errorCode]);

  const message = (error: FieldError | undefined): string =>
    error?.message
      ? error.message.startsWith('validation:')
        ? t(error.message as 'validation:password.tooLong', PASSWORD_LIMITS)
        : error.message
      : RESERVED_LINE;

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorCode(null);
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

  return (
    <form noValidate className="flex flex-col gap-2" onSubmit={(event) => void onSubmit(event)}>
      <PasswordField
        {...form.register('newPassword')}
        autoComplete="new-password"
        label={t('auth:resetPassword.newPassword')}
        required
        error={Boolean(errors.newPassword)}
        helperText={message(errors.newPassword)}
        describedBy={rulesId}
      />
      <PasswordField
        {...form.register('confirmPassword')}
        autoComplete="new-password"
        label={t('auth:resetPassword.confirmPassword')}
        required
        error={Boolean(errors.confirmPassword)}
        helperText={message(errors.confirmPassword)}
      />
      <PasswordRules
        id={rulesId}
        password={newPassword}
        extraRules={[
          {
            key: 'match',
            label: t('auth:resetPassword.rules.match'),
            met: newPassword !== '' && newPassword === confirmPassword,
          },
        ]}
      />
      <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
      <Button type="submit" variant="contained" size="large" fullWidth loading={isSubmitting}>
        {t('auth:resetPassword.submit')}
      </Button>
    </form>
  );
}
