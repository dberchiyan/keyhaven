import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { PATHS } from '@/shared/lib/paths';
import { AuthCard } from '../components/AuthCard';
import { ResetPasswordForm } from '../components/ResetPasswordForm';

/** The link from the reset email: choose a new password. */
export default function ResetPasswordPage() {
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
