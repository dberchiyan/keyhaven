import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { RESERVED_LINE } from '@/shared/hooks/use-field-message';
import { settingsPath } from '@/shared/lib/paths';

import { MESSAGE_MAX, type UseBookViewingResult } from '../hooks/use-book-viewing';

const MESSAGE_COUNTDOWN_FROM = 60;

export interface BookingFormProps {
    booking: UseBookViewingResult;
    isVerified: boolean;
}

/**
 * The tenant's request: an optional note and the submit, with one reserved error line above it
 * (FORM-2) — a missing slot, a server answer, or nothing. An unverified address is told so with
 * the way to fix it, since the API refuses the request until then.
 */
export function BookingForm({ booking, isVerified }: BookingFormProps): ReactElement {
    const { t } = useTranslation(['viewing', 'errors']);
    const { slot, message, setMessage, submit, isPending, errorCode, slotMissing, errorRef } = booking;

    const errorLine = (): ReactNode => {
        if (slotMissing) {
            return t('viewing:book.pickFirst');
        }
        if (errorCode === 'EMAIL_NOT_VERIFIED' || !isVerified) {
            return (
                <>
                    {t('viewing:book.verifyFirst')}{' '}
                    <Link component={RouterLink} to={settingsPath('account')}>
                        {t('viewing:book.verifyLink')}
                    </Link>
                </>
            );
        }
        return errorCode ? t(`errors:${errorCode}`) : RESERVED_LINE;
    };

    return (
        <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(event) => {
                event.preventDefault();
                void submit();
            }}
        >
            <TextField
                label={t('viewing:book.message')}
                multiline
                minRows={2}
                fullWidth
                value={message}
                onChange={(event) => {
                    setMessage(event.target.value);
                }}
                helperText={
                    message.length > MESSAGE_MAX - MESSAGE_COUNTDOWN_FROM
                        ? t('viewing:book.messageLeft', { count: MESSAGE_MAX - message.length })
                        : t('viewing:book.messageHint')
                }
                slotProps={{ htmlInput: { maxLength: MESSAGE_MAX } }}
            />
            <Typography
                ref={errorRef}
                tabIndex={-1}
                variant="body2"
                color="error"
                role={errorCode || slotMissing ? 'alert' : undefined}
                className="outline-none"
            >
                {errorLine()}
            </Typography>
            <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<EventAvailableOutlined aria-hidden />}
                loading={isPending}
                disabled={!isVerified}
                className="self-start"
            >
                {slot ? t('viewing:book.submit') : t('viewing:book.submitPick')}
            </Button>
        </form>
    );
}
