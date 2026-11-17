import Link from '@mui/material/Link';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, Navigate } from 'react-router';

import { PageLoader } from '@/shared/components/page-loader';
import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { PATHS } from '@/shared/lib/paths';

import { AuthCard } from '../components/auth-card';
import { SignupForm } from '../components/signup-form';
import { useCurrentUser } from '../hooks/use-current-user';

/** Create a tenant or landlord account; signed-in people go to the app. */
export function SignupPage(): ReactElement {
    const { t } = useTranslation('auth');
    useDocumentTitle(t('signup.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    const { data: user, isPending } = useCurrentUser();

    if (isPending) {
        return <PageLoader />;
    }
    if (user) {
        return <Navigate to={PATHS.home} replace />;
    }

    return (
        <AuthCard
            width="wide"
            headingRef={headingRef}
            title={t('signup.title')}
            subtitle={t('signup.subtitle')}
            footer={
                <>
                    {t('signup.haveAccount')}{' '}
                    <Link component={RouterLink} to={PATHS.login}>
                        {t('signup.signIn')}
                    </Link>
                </>
            }
        >
            <SignupForm />
        </AuthCard>
    );
}
