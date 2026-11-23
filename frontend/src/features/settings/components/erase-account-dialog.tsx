import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormErrorLine } from '@/shared/components/form-error-line';
import { PasswordField } from '@/shared/components/password-field';
import { useFieldMessage } from '@/shared/hooks/use-field-message';
import { PASSWORD_LIMITS } from '@/shared/lib/password-rules';

import { useEraseAccountForm } from '../hooks/use-erase-account-form';
import { EraseAccountReview } from './erase-account-review';

type Step = 'review' | 'password';

export interface EraseAccountDialogProps {
    open: boolean;
    onClose: () => void;
    onExited: () => void;
}

/**
 * Erasing one's account in two steps and one request (FORM-5): the review of what happens with
 * Cancel focused first, then the password and a destructive button naming the effect. Remounted per
 * opening (ARCH-33), so it always starts at the review; full-screen on a phone (RESP-4); closing is
 * blocked while the request runs.
 */
export function EraseAccountDialog({ open, onClose, onExited }: EraseAccountDialogProps): ReactElement {
    const { t } = useTranslation('settings');
    const fieldMessage = useFieldMessage();
    const titleId = useId();
    const reviewId = useId();
    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
    const cancelRef = useRef<HTMLButtonElement>(null);
    const [step, setStep] = useState<Step>('review');
    const { form, onSubmit, errorCode, errorRef } = useEraseAccountForm();
    const { errors, isSubmitting } = form.formState;

    useEffect(() => {
        requestAnimationFrame(() => {
            if (step === 'review') {
                cancelRef.current?.focus();
                return;
            }
            form.setFocus('password');
        });
    }, [step, form]);

    return (
        <Dialog
            open={open}
            onClose={isSubmitting ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isPhone}
            aria-labelledby={titleId}
            aria-describedby={reviewId}
            slotProps={{ transition: { onExited } }}
        >
            <DialogTitle id={titleId}>{t('data.erase.title')}</DialogTitle>
            <form noValidate className="flex flex-col" onSubmit={(event) => void onSubmit(event)}>
                <DialogContent dividers className="flex flex-col gap-4">
                    {step === 'review' ? (
                        <EraseAccountReview id={reviewId} />
                    ) : (
                        <>
                            <Typography id={reviewId} variant="body2">
                                {t('data.erase.passwordLead')}
                            </Typography>
                            <PasswordField
                                {...form.register('password')}
                                autoComplete="current-password"
                                label={t('data.erase.password')}
                                required
                                error={Boolean(errors.password)}
                                helperText={fieldMessage(errors.password, PASSWORD_LIMITS)}
                            />
                            <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
                        </>
                    )}
                </DialogContent>
                <DialogActions className="flex-wrap gap-2 px-4 py-3 sm:px-6 sm:py-4">
                    <Button ref={cancelRef} onClick={onClose} disabled={isSubmitting}>
                        {t('data.erase.cancel')}
                    </Button>
                    {step === 'review' ? (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => {
                                setStep('password');
                            }}
                        >
                            {t('data.erase.continue')}
                        </Button>
                    ) : (
                        <Button type="submit" variant="contained" color="error" loading={isSubmitting}>
                            {t('data.erase.submit')}
                        </Button>
                    )}
                </DialogActions>
            </form>
        </Dialog>
    );
}
