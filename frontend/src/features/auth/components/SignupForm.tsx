import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { Controller, type FieldError, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PasswordField } from '@/shared/components/PasswordField';
import { PasswordRules } from '@/shared/components/PasswordRules';
import { PASSWORD_LIMITS } from '@/shared/lib/passwordRules';
import { useSignupForm } from '../hooks/useSignupForm';
import { SIGNUP_LIMITS, SIGNUP_ROLES, type SignupValues } from '../schemas';
import { FormErrorLine, RESERVED_LINE } from './FormErrorLine';

const ROLE_ICONS = { TENANT: SearchOutlined, LANDLORD: HomeWorkOutlined } as const;

/** Who you are (tenant or landlord), your name, email and a password; creating signs you in. */
export function SignupForm() {
    const { t } = useTranslation(['auth', 'validation']);
    const { form, onSubmit, errorCode, errorRef } = useSignupForm();
    const { errors, isSubmitting } = form.formState;
    const rulesId = useId();
    const roleLabelId = useId();
    const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
    const password = useWatch({ control: form.control, name: 'password' });

    const message = (field: keyof SignupValues, error: FieldError | undefined): string =>
        error?.message
            ? error.message.startsWith('validation:')
                ? t(error.message as 'validation:email.invalid', {
                      max: field === 'role' ? 0 : SIGNUP_LIMITS[field],
                      min: PASSWORD_LIMITS.min,
                  })
                : error.message
            : RESERVED_LINE;

    return (
        <form noValidate className="flex flex-col gap-2" onSubmit={(event) => void onSubmit(event)}>
            <Typography id={roleLabelId} variant="subtitle2" component="p">
                {t('auth:signup.role')}
            </Typography>
            <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                    <ToggleButtonGroup
                        exclusive
                        fullWidth
                        // Stacked on a phone: each option is a row with room for its hint, instead of two
                        // narrow cells that break "Looking for a home" over three lines.
                        orientation={isPhone ? 'vertical' : 'horizontal'}
                        value={field.value}
                        aria-labelledby={roleLabelId}
                        onChange={(_event, value: unknown) => {
                            // Clicking the chosen option again keeps it (one is always on).
                            if (SIGNUP_ROLES.some((role) => role === value)) {
                                field.onChange(value);
                            }
                        }}
                        className="mb-2"
                    >
                        {SIGNUP_ROLES.map((role) => {
                            const Icon = ROLE_ICONS[role];
                            return (
                                <ToggleButton
                                    key={role}
                                    value={role}
                                    className="min-h-16 justify-start gap-3 px-4 py-2 text-left"
                                >
                                    <Icon aria-hidden fontSize="small" className="shrink-0" />
                                    <span className="flex min-w-0 flex-col">
                                        <span>{t(`auth:signup.roles.${role}`)}</span>
                                        <Typography variant="caption" component="span" color="textSecondary">
                                            {t(`auth:signup.roles.${role}_hint`)}
                                        </Typography>
                                    </span>
                                </ToggleButton>
                            );
                        })}
                    </ToggleButtonGroup>
                )}
            />
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <TextField
                    {...form.register('firstName')}
                    label={t('auth:signup.firstName')}
                    autoComplete="given-name"
                    required
                    error={Boolean(errors.firstName)}
                    helperText={message('firstName', errors.firstName)}
                    slotProps={{ htmlInput: { maxLength: SIGNUP_LIMITS.firstName } }}
                />
                <TextField
                    {...form.register('lastName')}
                    label={t('auth:signup.lastName')}
                    autoComplete="family-name"
                    required
                    error={Boolean(errors.lastName)}
                    helperText={message('lastName', errors.lastName)}
                    slotProps={{ htmlInput: { maxLength: SIGNUP_LIMITS.lastName } }}
                />
            </div>
            <TextField
                {...form.register('email')}
                label={t('auth:signup.email')}
                type="email"
                autoComplete="username"
                required
                error={Boolean(errors.email)}
                helperText={errors.email ? message('email', errors.email) : t('auth:signup.emailHint')}
                slotProps={{
                    htmlInput: {
                        inputMode: 'email',
                        autoCapitalize: 'none',
                        spellCheck: false,
                        maxLength: SIGNUP_LIMITS.email,
                    },
                }}
            />
            <PasswordField
                {...form.register('password')}
                autoComplete="new-password"
                label={t('auth:signup.password')}
                required
                error={Boolean(errors.password)}
                helperText={message('password', errors.password)}
                describedBy={rulesId}
            />
            <PasswordRules id={rulesId} password={password} />
            <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
            <Button type="submit" variant="contained" size="large" fullWidth loading={isSubmitting}>
                {t('auth:signup.submit')}
            </Button>
        </form>
    );
}
