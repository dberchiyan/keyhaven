import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { PATHS } from '@/shared/lib/paths';
import { AuthCard } from '../components/AuthCard';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useEmailVerification } from '../hooks/useEmailVerification';

/** The link from the verification email, signed in or not. */
export default function VerifyEmailPage() {
    const { t } = useTranslation(['auth', 'errors']);
    useDocumentTitle(t('auth:verifyEmail.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    const { token, verify } = useEmailVerification();
    const { data: user } = useCurrentUser();
    const continueTo = user ? PATHS.home : PATHS.login;
    const failure = !token
        ? t('auth:verifyEmail.missing')
        : verify.isError
          ? verify.error.code === 'BUSINESS_RULE_VIOLATION'
              ? t('auth:verifyEmail.failedText')
              : t(`errors:${verify.error.code}`)
          : null;

    const title = verify.isSuccess
        ? t('auth:verifyEmail.successTitle')
        : verify.isError || !token
          ? t('auth:verifyEmail.failedTitle')
          : t('auth:verifyEmail.title');

    return (
        <AuthCard headingRef={headingRef} title={title}>
            <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 text-center">
                {verify.isSuccess ? (
                    <>
                        <CheckCircleOutlined aria-hidden fontSize="large" className="text-success" />
                        <Typography variant="body1">
                            {t('auth:verifyEmail.successText', { email: verify.data.email })}
                        </Typography>
                        <Button component={RouterLink} to={continueTo} variant="contained" size="large">
                            {t('auth:verifyEmail.continue')}
                        </Button>
                    </>
                ) : failure !== null ? (
                    <>
                        <ErrorOutlineOutlined aria-hidden fontSize="large" color="error" />
                        <Typography variant="body1">{failure}</Typography>
                        <Button component={RouterLink} to={continueTo} variant="outlined" size="large">
                            {user ? t('auth:verifyEmail.continue') : t('auth:verifyEmail.signIn')}
                        </Button>
                    </>
                ) : (
                    <>
                        <CircularProgress size={32} aria-hidden />
                        <Typography variant="body1">{t('auth:verifyEmail.checking')}</Typography>
                    </>
                )}
            </div>
        </AuthCard>
    );
}
