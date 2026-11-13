import Link from '@mui/material/Link';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { PATHS } from '@/shared/lib/paths';
import { AuthCard } from '../components/AuthCard';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
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
