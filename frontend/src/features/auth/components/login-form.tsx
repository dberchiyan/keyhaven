import MailOutlined from '@mui/icons-material/MailOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { FormErrorLine } from '@/shared/components/form-error-line';
import { PasswordField } from '@/shared/components/password-field';
import { useFieldMessage } from '@/shared/hooks/use-field-message';
import { PATHS } from '@/shared/lib/paths';

import { useLoginForm } from '../hooks/use-login-form';
import { LOGIN_FIELD_LIMITS } from '../schemas';

/** Email and password; a lost session arrives here with a notice saying why (NAV-3). */
export function LoginForm(): ReactElement {
    const { t } = useTranslation('auth');
    const fieldMessage = useFieldMessage();
    const { form, onSubmit, errorCode, errorSummaryRef, isSessionExpired } = useLoginForm();
    const { register, formState } = form;
    const { errors, isSubmitting } = formState;

    return (
        <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-2">
            {isSessionExpired && (
                <Alert severity="info" role="status">
                    {t('login.sessionExpired')}
                </Alert>
            )}
            <TextField
                {...register('email')}
                label={t('login.email')}
                type="email"
                autoComplete="username"
                required
                fullWidth
                error={Boolean(errors.email)}
                helperText={fieldMessage(errors.email, { max: LOGIN_FIELD_LIMITS.email })}
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
            <PasswordField
                {...register('password')}
                label={t('login.password')}
                autoComplete="current-password"
                required
                fullWidth
                error={Boolean(errors.password)}
                helperText={fieldMessage(errors.password, { max: LOGIN_FIELD_LIMITS.password })}
            />
            <Link component={RouterLink} to={PATHS.forgotPassword} variant="body2" className="self-end">
                {t('login.forgotPassword')}
            </Link>
            <FormErrorLine errorRef={errorSummaryRef} errorCode={errorCode} />
            <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting}
                aria-busy={isSubmitting}
            >
                {isSubmitting ? t('login.submitting') : t('login.submit')}
            </Button>
        </form>
    );
}
