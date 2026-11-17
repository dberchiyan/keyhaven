import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactElement, useId } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormErrorLine } from '@/shared/components/form-error-line';
import { PasswordField } from '@/shared/components/password-field';
import { PasswordRules } from '@/shared/components/password-rules';
import { useFieldMessage } from '@/shared/hooks/use-field-message';
import { PASSWORD_LIMITS } from '@/shared/lib/password-rules';

import { useSignupForm } from '../hooks/use-signup-form';
import { SIGNUP_LIMITS, SIGNUP_ROLES } from '../schemas';

const ROLE_ICONS = { TENANT: SearchOutlined, LANDLORD: HomeWorkOutlined } as const;

/**
 * Sign-up for tenants and landlords (agents and admins are created by staff). The role picker
 * stacks on a phone, where two side-by-side cards would truncate their hints (RESP-4).
 */
export function SignupForm(): ReactElement {
    const { t } = useTranslation('auth');
    const { form, onSubmit, errorCode, errorRef } = useSignupForm();
    const { errors, isSubmitting } = form.formState;
    const rulesId = useId();
    const roleLabelId = useId();
    const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
    const password = useWatch({ control: form.control, name: 'password' });

    const fieldMessage = useFieldMessage();

    return (
        <form noValidate className="flex flex-col gap-2" onSubmit={(event) => void onSubmit(event)}>
            <Typography id={roleLabelId} variant="subtitle2" component="p">
                {t('signup.role')}
            </Typography>
            <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                    <ToggleButtonGroup
                        exclusive
                        fullWidth
                        orientation={isPhone ? 'vertical' : 'horizontal'}
                        value={field.value}
                        aria-labelledby={roleLabelId}
                        onChange={(_event, value: unknown) => {
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
                                        <span>{t(`signup.roles.${role}`)}</span>
                                        <Typography variant="caption" component="span" color="textSecondary">
                                            {t(`signup.roles.${role}_hint`)}
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
                    label={t('signup.firstName')}
                    autoComplete="given-name"
                    required
                    error={Boolean(errors.firstName)}
                    helperText={fieldMessage(errors.firstName, { max: SIGNUP_LIMITS.firstName })}
                    slotProps={{ htmlInput: { maxLength: SIGNUP_LIMITS.firstName } }}
                />
                <TextField
                    {...form.register('lastName')}
                    label={t('signup.lastName')}
                    autoComplete="family-name"
                    required
                    error={Boolean(errors.lastName)}
                    helperText={fieldMessage(errors.lastName, { max: SIGNUP_LIMITS.lastName })}
                    slotProps={{ htmlInput: { maxLength: SIGNUP_LIMITS.lastName } }}
                />
            </div>
            <TextField
                {...form.register('email')}
                label={t('signup.email')}
                type="email"
                autoComplete="username"
                required
                error={Boolean(errors.email)}
                helperText={fieldMessage(errors.email, { max: SIGNUP_LIMITS.email, hint: t('signup.emailHint') })}
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
                label={t('signup.password')}
                required
                error={Boolean(errors.password)}
                helperText={fieldMessage(errors.password, { max: SIGNUP_LIMITS.password, min: PASSWORD_LIMITS.min })}
                describedBy={rulesId}
            />
            <PasswordRules id={rulesId} password={password} />
            <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
            <Button type="submit" variant="contained" size="large" fullWidth loading={isSubmitting}>
                {t('signup.submit')}
            </Button>
        </form>
    );
}
