import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUser, useResendVerification } from '../hooks/use-auth-queries';

/**
 * Shown on every signed-in page until the email address is verified: publishing a home and (M2)
 * booking a viewing wait for it. "Resend email" asks for a new link; a 429 shows as its message.
 */
export function VerificationBanner(): ReactElement | null {
    const { t } = useTranslation(['auth', 'errors']);
    const user = useCurrentUser().data;
    const resend = useResendVerification();
    const [isSent, setIsSent] = useState(false);

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
                                    setIsSent(true);
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
            <Snackbar
                open={isSent}
                onClose={(_event, reason) => {
                    if (reason !== 'clickaway') {
                        setIsSent(false);
                    }
                }}
                message={t('auth:verification.resent', { email: user.email })}
                action={
                    <Button
                        color="inherit"
                        size="small"
                        onClick={() => {
                            setIsSent(false);
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
