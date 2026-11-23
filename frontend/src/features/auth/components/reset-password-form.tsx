import Button from '@mui/material/Button';
import { type ReactElement, useId } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormErrorLine } from '@/shared/components/form-error-line';
import { PasswordField } from '@/shared/components/password-field';
import { PasswordRules } from '@/shared/components/password-rules';
import { useFieldMessage } from '@/shared/hooks/use-field-message';
import { PASSWORD_LIMITS } from '@/shared/lib/password-rules';

import { useResetPasswordForm } from '../hooks/use-reset-password-form';

export interface ResetPasswordFormProps {
    token: string;
}

/** A new password twice, with the rules ticked off live and a "match" rule for the repeat. */
export function ResetPasswordForm({ token }: ResetPasswordFormProps): ReactElement {
    const { t } = useTranslation('auth');
    const fieldMessage = useFieldMessage();
    const { form, onSubmit, errorCode, errorRef } = useResetPasswordForm(token);
    const rulesId = useId();
    const { errors, isSubmitting } = form.formState;
    const [newPassword, confirmPassword] = useWatch({
        control: form.control,
        name: ['newPassword', 'confirmPassword'],
    });

    return (
        <form noValidate className="flex flex-col gap-2" onSubmit={(event) => void onSubmit(event)}>
            <PasswordField
                {...form.register('newPassword')}
                autoComplete="new-password"
                label={t('resetPassword.newPassword')}
                required
                error={Boolean(errors.newPassword)}
                helperText={fieldMessage(errors.newPassword, PASSWORD_LIMITS)}
                describedBy={rulesId}
            />
            <PasswordField
                {...form.register('confirmPassword')}
                autoComplete="new-password"
                label={t('resetPassword.confirmPassword')}
                required
                error={Boolean(errors.confirmPassword)}
                helperText={fieldMessage(errors.confirmPassword)}
            />
            <PasswordRules
                id={rulesId}
                password={newPassword}
                extraRules={[
                    {
                        key: 'match',
                        label: t('resetPassword.rules.match'),
                        met: newPassword !== '' && newPassword === confirmPassword,
                    },
                ]}
            />
            <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
            <Button type="submit" variant="contained" size="large" fullWidth loading={isSubmitting}>
                {t('resetPassword.submit')}
            </Button>
        </form>
    );
}
