import Link from '@mui/material/Link';
import { domAnimation, LazyMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Navigate, Link as RouterLink } from 'react-router';
import { PageLoader } from '@/shared/components/PageLoader';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { PATHS } from '@/shared/lib/paths';
import { AppPreview } from '../components/AppPreview';
import { AuthCard } from '../components/AuthCard';
import { LoginForm } from '../components/LoginForm';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useLoginRedirect } from '../hooks/useLoginRedirect';

export default function LoginPage() {
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
