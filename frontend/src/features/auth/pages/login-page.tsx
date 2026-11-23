import Link from '@mui/material/Link';
import { domAnimation, LazyMotion } from 'motion/react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, Navigate } from 'react-router';

import { PageLoader } from '@/shared/components/page-loader';
import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { PATHS } from '@/shared/lib/paths';

import { AppPreview } from '../components/app-preview';
import { AuthCard } from '../components/auth-card';
import { LoginForm } from '../components/login-form';
import { useCurrentUser } from '../hooks/use-auth-queries';
import { useLoginRedirect } from '../hooks/use-login-redirect';

export function LoginPage(): ReactElement {
    const { t } = useTranslation('auth');
    useDocumentTitle(t('login.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    const { data: user, isPending } = useCurrentUser();
    const { target } = useLoginRedirect();

    if (isPending) {
        return <PageLoader />;
    }
    if (user) {
        return <Navigate to={target} replace />;
    }

    return (
        <LazyMotion features={domAnimation} strict>
            <AuthCard
                headingRef={headingRef}
                title={t('login.title')}
                footer={
                    <>
                        {t('login.noAccount')}{' '}
                        <Link component={RouterLink} to={PATHS.signup}>
                            {t('login.createAccount')}
                        </Link>
                    </>
                }
                aside={<AppPreview />}
            >
                <LoginForm />
            </AuthCard>
        </LazyMotion>
    );
}
