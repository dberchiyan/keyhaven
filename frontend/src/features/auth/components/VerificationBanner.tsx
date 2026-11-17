import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResendVerification } from '../hooks/useAccountRecovery';
import { useCurrentUser } from '../hooks/useCurrentUser';

/**
 * Shown on every signed-in page until the email address is verified: publishing a home and (M2)
 * booking a viewing wait for it. "Resend email" asks for a new link; a 429 shows as its message.
 */
export function VerificationBanner() {
    const { t } = useTranslation(['auth', 'errors']);
    const user = useCurrentUser().data;
    const resend = useResendVerification();
    const [sent, setSent] = useState(false);

    if (!user || user.emailVerifiedAt) {
        return null;
    }
    return (
        <>
            <Alert
                severity="info"
                role="status"
                className="rounded-none border-b border-divider"
                action={
                    <Button
                        color="inherit"
                        size="small"
                        loading={resend.isPending}
                        onClick={() => {
                            resend.mutate(undefined, {
                                onSuccess: () => {
                                    setSent(true);
                                },
                            });
                        }}
                    >
                        {t('auth:verification.resend')}
                    </Button>
                }
            >
                {resend.isError
                    ? t(`errors:${resend.error.code}`)
                    : t('auth:verification.banner', { email: user.email })}
            </Alert>
            {/* Stays until dismissed (no auto-dismiss of unread messages). */}
            <Snackbar
                open={sent}
                onClose={(_event, reason) => {
                    if (reason !== 'clickaway') {
                        setSent(false);
                    }
                }}
                message={t('auth:verification.resent', { email: user.email })}
                action={
                    <Button
                        color="inherit"
                        size="small"
                        onClick={() => {
                            setSent(false);
                        }}
                    >
                        {t('auth:verification.dismiss')}
                    </Button>
                }
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                slotProps={{ content: { role: 'status' } }}
            />
        </>
    );
}
