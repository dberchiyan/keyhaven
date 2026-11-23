import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type CurrentUser, useResendVerification } from '@/features/auth';
import { StatusBadge } from '@/shared/components/status-badge';

export interface EmailVerificationStatusProps {
    user: CurrentUser;
}

/** Verified (with the date) or not — with "Resend verification email" while it is not. */
export function EmailVerificationStatus({ user }: EmailVerificationStatusProps): ReactElement {
    const { t, i18n } = useTranslation(['settings', 'errors']);
    const resend = useResendVerification();
    const [isSent, setIsSent] = useState(false);

    if (user.emailVerifiedAt) {
        return (
            <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="success" label={t('account.profile.verified')} />
                <Typography variant="body2" component="span" color="textSecondary">
                    {t('account.profile.verifiedHint', {
                        date: new Intl.DateTimeFormat(i18n.language, {
                            dateStyle: 'medium',
                            timeZone: 'UTC',
                        }).format(new Date(user.emailVerifiedAt)),
                    })}
                </Typography>
            </div>
        );
    }
    return (
        <>
            <Alert
                severity="warning"
                role="status"
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
                        {t('account.profile.resend')}
                    </Button>
                }
            >
                <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="warning" label={t('account.profile.unverified')} />
                    {resend.isError ? t(`errors:${resend.error.code}`) : t('account.profile.unverifiedHint')}
                </span>
            </Alert>
            <Snackbar
                open={isSent}
                onClose={(_event, reason) => {
                    if (reason !== 'clickaway') {
                        setIsSent(false);
                    }
                }}
                message={t('account.profile.resent', { email: user.email })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                slotProps={{ content: { role: 'status' } }}
            />
        </>
    );
}
