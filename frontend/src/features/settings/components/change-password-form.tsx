import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { type ReactElement, useId } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormErrorLine } from '@/shared/components/form-error-line';
import { PasswordField } from '@/shared/components/password-field';
import { PasswordRules } from '@/shared/components/password-rules';
import { useFieldMessage } from '@/shared/hooks/use-field-message';
import { PASSWORD_LIMITS } from '@/shared/lib/password-rules';

import { useChangePasswordForm } from '../hooks/use-change-password-form';

/**
 * Current password, the new one twice; the rules box sits beside the fields once the container is
 * wide enough (RESP-3), and says the new one must differ from the current one.
 */
export function ChangePasswordForm(): ReactElement {
    const { t } = useTranslation('settings');
    const fieldMessage = useFieldMessage();
    const { form, onSubmit, errorCode, errorRef, isDone, doneRef } = useChangePasswordForm();
    const { errors, isSubmitting } = form.formState;
    const rulesId = useId();
    const [currentPassword, newPassword, confirmPassword] = useWatch({
        control: form.control,
        name: ['currentPassword', 'newPassword', 'confirmPassword'],
    });

    return (
        <form
            noValidate
            className="grid grid-cols-1 gap-8 @3xl:grid-cols-[minmax(0,var(--spacing-password-form))_var(--spacing-password-rules)]"
            onSubmit={(event) => void onSubmit(event)}
        >
            <div className="flex flex-col gap-2">
                {isDone && (
                    <Alert ref={doneRef} tabIndex={-1} severity="success" className="outline-none">
                        {t('account.password.done')}
                    </Alert>
                )}
                <PasswordField
                    {...form.register('currentPassword')}
                    autoComplete="current-password"
                    label={t('account.password.current')}
                    required
                    error={Boolean(errors.currentPassword)}
                    helperText={fieldMessage(errors.currentPassword, PASSWORD_LIMITS)}
                />
                <PasswordField
                    {...form.register('newPassword')}
                    autoComplete="new-password"
                    label={t('account.password.new')}
                    required
                    error={Boolean(errors.newPassword)}
                    helperText={fieldMessage(errors.newPassword, PASSWORD_LIMITS)}
                    describedBy={rulesId}
                />
                <PasswordField
                    {...form.register('confirmPassword')}
                    autoComplete="new-password"
                    label={t('account.password.confirm')}
                    required
                    error={Boolean(errors.confirmPassword)}
                    helperText={fieldMessage(errors.confirmPassword, PASSWORD_LIMITS)}
                />
                <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
                <div>
                    <Button type="submit" variant="contained" loading={isSubmitting}>
                        {t('account.password.submit')}
                    </Button>
                </div>
            </div>
            <PasswordRules
                id={rulesId}
                password={newPassword}
                extraRules={[
                    {
                        key: 'different',
                        label: t('account.password.rules.different'),
                        met: newPassword !== '' && newPassword !== currentPassword,
                    },
                    {
                        key: 'match',
                        label: t('account.password.rules.match'),
                        met: newPassword !== '' && newPassword === confirmPassword,
                    },
                ]}
            />
        </form>
    );
}
