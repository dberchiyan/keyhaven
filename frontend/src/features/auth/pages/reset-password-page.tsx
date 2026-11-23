import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useSearchParams } from 'react-router';

import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { PATHS } from '@/shared/lib/paths';

import { AuthCard } from '../components/auth-card';
import { ResetPasswordForm } from '../components/reset-password-form';

/** The link from the reset email: choose a new password. */
export function ResetPasswordPage(): ReactElement {
    const { t } = useTranslation('auth');
    useDocumentTitle(t('resetPassword.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token')?.trim() ?? '';
    return (
        <AuthCard
            headingRef={headingRef}
            title={t('resetPassword.title')}
            subtitle={t('resetPassword.subtitle')}
            footer={
                <Link component={RouterLink} to={PATHS.forgotPassword}>
                    {t('resetPassword.requestAgain')}
                </Link>
            }
        >
            {token ? (
                <ResetPasswordForm token={token} />
            ) : (
                <Alert severity="error" role="alert">
                    {t('resetPassword.missing')}
                </Alert>
            )}
        </AuthCard>
    );
}
