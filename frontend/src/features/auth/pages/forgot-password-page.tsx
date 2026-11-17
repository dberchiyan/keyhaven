import Link from '@mui/material/Link';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { PATHS } from '@/shared/lib/paths';

import { AuthCard } from '../components/auth-card';
import { ForgotPasswordForm } from '../components/forgot-password-form';

export function ForgotPasswordPage(): ReactElement {
    const { t } = useTranslation('auth');
    useDocumentTitle(t('forgotPassword.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    return (
        <AuthCard
            headingRef={headingRef}
            title={t('forgotPassword.title')}
            subtitle={t('forgotPassword.subtitle')}
            footer={
                <Link component={RouterLink} to={PATHS.login}>
                    {t('forgotPassword.backToLogin')}
                </Link>
            }
        >
            <ForgotPasswordForm />
        </AuthCard>
    );
}
