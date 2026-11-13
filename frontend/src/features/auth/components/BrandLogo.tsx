import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BrandMark } from '@/shared/components/BrandMark';
import { PATHS } from '@/shared/lib/paths';

/** Keyhaven mark + wordmark + tagline, linking home (signed-out screens). */
export function BrandLogo() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Link
        to={PATHS.home}
        aria-label={t('app.home')}
        className="group rounded-2xl -m-2 flex items-center gap-3 p-2 no-underline"
      >
        <BrandMark className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0" />
        <Typography
          variant="h2"
          component="span"
          className="text-secondary transition-colors duration-300 group-hover:text-primary dark:text-text-primary dark:group-hover:text-primary"
        >
          {t('app.name')}
        </Typography>
      </Link>
      <Typography variant="subtitle1" component="p" color="textSecondary">
        {t('app.tagline')}
      </Typography>
    </div>
  );
}
