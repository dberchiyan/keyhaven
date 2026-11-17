import Link from '@mui/material/Link';
import { useTranslation } from 'react-i18next';
import { Navigate, Link as RouterLink } from 'react-router';
import { PageLoader } from '@/shared/components/PageLoader';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { PATHS } from '@/shared/lib/paths';
import { AuthCard } from '../components/AuthCard';
import { SignupForm } from '../components/SignupForm';
import { useCurrentUser } from '../hooks/useCurrentUser';

/** Create a tenant or landlord account; signed-in people go to the app. */
export default function SignupPage() {
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
