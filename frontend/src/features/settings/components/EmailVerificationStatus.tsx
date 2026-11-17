import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type CurrentUser, useResendVerification } from '@/features/auth';
import { StatusBadge } from '@/shared/components/StatusBadge';

export interface EmailVerificationStatusProps {
    user: CurrentUser;
}

/** Verified (with the date) or not — with "Resend verification email" while it is not. */
export function EmailVerificationStatus({ user }: EmailVerificationStatusProps) {
    const { t, i18n } = useTranslation(['settings', 'errors']);
    const resend = useResendVerification();
    const [sent, setSent] = useState(false);

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
                                    setSent(true);
                                },
                            });
                        }}
                    >
                        {t('account.profile.resend')}
                    </Button>
                }
            >
                <StatusBadge tone="warning" label={t('account.profile.unverified')} className="mr-2" />
                {resend.isError ? t(`errors:${resend.error.code}`) : t('account.profile.unverifiedHint')}
            </Alert>
            <Snackbar
                open={sent}
                onClose={(_event, reason) => {
                    if (reason !== 'clickaway') {
                        setSent(false);
                    }
                }}
                message={t('account.profile.resent', { email: user.email })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                slotProps={{ content: { role: 'status' } }}
            />
        </>
    );
}
