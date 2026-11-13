import AddOutlined from '@mui/icons-material/AddOutlined';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { useAccess } from '@/features/auth';
import { PATHS } from '@/shared/lib/paths';

export interface ShowcaseNoticeProps {
  /** `listing`: on one showcase listing; `dashboard`: above the list, about all of them. */
  scope: 'listing' | 'dashboard';
}

/**
 * The public demo's rule, said once and in the open: showcase listings are read-only, anything
 * the person adds is theirs to change, and everything resets at midnight. The disabled actions
 * next to it never have to explain themselves.
 */
export function ShowcaseNotice({ scope }: ShowcaseNoticeProps) {
  const { t } = useTranslation('listing');
  const can = useAccess();
  return (
    <Alert
      severity="info"
      action={
        can('listing.create') ? (
          <Button
            component={RouterLink}
            to={PATHS.newListing}
            color="inherit"
            size="small"
            startIcon={<AddOutlined aria-hidden />}
            className="whitespace-nowrap"
          >
            {t('showcase.add')}
          </Button>
        ) : undefined
      }
      className="items-center"
    >
      <AlertTitle>{t(`showcase.${scope}.title`)}</AlertTitle>
      {t(`showcase.${scope}.text`)}
    </Alert>
  );
}
