import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { PATHS } from '@/shared/lib/paths';

import { AuthCard } from '../components/auth-card';
import { useCurrentUser } from '../hooks/use-current-user';
import { useEmailVerification } from '../hooks/use-email-verification';

/**
 * The link from the verification email works signed in or not; the outcome is a polite live
 * region (A11Y-5). A spent or expired token is a business-rule violation and gets its own wording.
 */
export function VerifyEmailPage(): ReactElement {
    const { t } = useTranslation(['auth', 'errors']);
    useDocumentTitle(t('auth:verifyEmail.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    const { token, verify } = useEmailVerification();
    const { data: user } = useCurrentUser();
    const continueTo = user ? PATHS.home : PATHS.login;

    const failureText = (): string | undefined => {
        if (!token) {
            return t('auth:verifyEmail.missing');
        }
        if (!verify.isError) {
            return undefined;
        }
        return verify.error.code === 'BUSINESS_RULE_VIOLATION'
            ? t('auth:verifyEmail.failedText')
            : t(`errors:${verify.error.code}`);
    };
    const failure = failureText();

    const titleText = (): string => {
        if (verify.isSuccess) {
            return t('auth:verifyEmail.successTitle');
        }
        return failure === undefined ? t('auth:verifyEmail.title') : t('auth:verifyEmail.failedTitle');
    };

    return (
        <AuthCard headingRef={headingRef} title={titleText()}>
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
                ) : failure !== undefined ? (
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
