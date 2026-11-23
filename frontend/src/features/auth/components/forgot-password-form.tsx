import MailOutlined from '@mui/icons-material/MailOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { FormErrorLine } from '@/shared/components/form-error-line';
import { useFieldMessage } from '@/shared/hooks/use-field-message';

import { useForgotPasswordForm } from '../hooks/use-forgot-password-form';
import { EMAIL_MAX_LENGTH } from '../schemas';

/** Email → a reset link (A11Y-4: a real label, `autocomplete`, the email keyboard). */
export function ForgotPasswordForm(): ReactElement {
    const { t } = useTranslation('auth');
    const fieldMessage = useFieldMessage();
    const { form, onSubmit, errorCode, errorRef, sentTo, sentRef } = useForgotPasswordForm();
    const { errors, isSubmitting } = form.formState;

    if (sentTo) {
        return (
            <Alert ref={sentRef} tabIndex={-1} severity="success" role="status" className="outline-none">
                <strong>{t('forgotPassword.sentTitle')}</strong>
                <br />
                {t('forgotPassword.sentText', { email: sentTo })}
            </Alert>
        );
    }

    return (
        <form noValidate className="flex flex-col gap-2" onSubmit={(event) => void onSubmit(event)}>
            <TextField
                {...form.register('email')}
                label={t('forgotPassword.email')}
                type="email"
                autoComplete="username"
                required
                fullWidth
                error={Boolean(errors.email)}
                helperText={fieldMessage(errors.email, { max: EMAIL_MAX_LENGTH })}
                slotProps={{
                    htmlInput: { inputMode: 'email', autoCapitalize: 'none', spellCheck: false },
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <MailOutlined aria-hidden />
                            </InputAdornment>
                        ),
                    },
                }}
            />
            <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
            <Button type="submit" variant="contained" size="large" fullWidth loading={isSubmitting}>
                {t('forgotPassword.submit')}
            </Button>
        </form>
    );
}
