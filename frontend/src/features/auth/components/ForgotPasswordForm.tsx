import { zodResolver } from '@hookform/resolvers/zod';
import MailOutlined from '@mui/icons-material/MailOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { useEffect, useRef, useState } from 'react';
import { type FieldError, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/shared/api/apiError';
import type { ErrorCode } from '@/shared/types';
import { useRequestPasswordReset } from '../hooks/useAccountRecovery';
import {
    EMAIL_MAX_LENGTH,
    type ForgotPasswordOutput,
    type ForgotPasswordValues,
    forgotPasswordSchema,
} from '../schemas';
import { FormErrorLine, RESERVED_LINE } from './FormErrorLine';

/** Email → a reset link; the answer never says whether the address has an account. */
export function ForgotPasswordForm() {
    const { t } = useTranslation(['auth', 'validation']);
    const request = useRequestPasswordReset();
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
    const errorRef = useRef<HTMLDivElement>(null);
    const sentRef = useRef<HTMLDivElement>(null);
    const form = useForm<ForgotPasswordValues, unknown, ForgotPasswordOutput>({
        resolver: zodResolver(forgotPasswordSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: { email: '' },
    });
    const { errors, isSubmitting } = form.formState;

    useEffect(() => {
        if (errorCode) {
            errorRef.current?.focus();
        }
    }, [errorCode]);
    useEffect(() => {
        if (sentTo) {
            sentRef.current?.focus();
        }
    }, [sentTo]);

    const message = (error: FieldError | undefined): string =>
        error?.message
            ? error.message.startsWith('validation:')
                ? t(error.message as 'validation:email.invalid', { max: EMAIL_MAX_LENGTH })
                : error.message
            : RESERVED_LINE;

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(null);
        try {
            await request.mutateAsync(values);
            setSentTo(values.email);
        } catch (error) {
            if (!isApiError(error)) {
                throw error;
            }
            setErrorCode(error.code);
        }
    });

    if (sentTo) {
        return (
            <Alert ref={sentRef} tabIndex={-1} severity="success" role="status" className="outline-none">
                <strong>{t('auth:forgotPassword.sentTitle')}</strong>
                <br />
                {t('auth:forgotPassword.sentText', { email: sentTo })}
            </Alert>
        );
    }

    return (
        <form noValidate className="flex flex-col gap-2" onSubmit={(event) => void onSubmit(event)}>
            <TextField
                {...form.register('email')}
                label={t('auth:forgotPassword.email')}
                type="email"
                autoComplete="username"
                required
                fullWidth
                error={Boolean(errors.email)}
                helperText={message(errors.email)}
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
                {t('auth:forgotPassword.submit')}
            </Button>
        </form>
    );
}
