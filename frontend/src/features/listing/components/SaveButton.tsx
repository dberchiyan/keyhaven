import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import FavoriteOutlined from '@mui/icons-material/FavoriteOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next';
import { useAccess } from '@/features/auth';
import { cn } from '@/shared/lib/cn';
import { useToggleSaved } from '../hooks/useListingQueries';

export interface SaveButtonProps {
  listingId: string;
  saved: boolean;
  title: string;
  className?: string;
}

/** The heart: tenants only; the accessible name says what pressing it does. */
export function SaveButton({ listingId, saved, title, className }: SaveButtonProps) {
  const { t } = useTranslation('listing');
  const can = useAccess();
  const toggle = useToggleSaved();
  if (!can('listing.save')) {
    return null;
  }
  const label = saved ? t('save.remove', { title }) : t('save.add', { title });
  return (
    <Tooltip title={saved ? t('save.saved') : t('save.save')}>
      <IconButton
        aria-label={label}
        aria-pressed={saved}
        disabled={toggle.isPending}
        onClick={() => {
          toggle.mutate({ listingId, saved });
        }}
        className={cn(
          'bg-background-paper/90 text-text-primary hover:bg-background-paper',
          className,
        )}
      >
        {saved ? (
          <FavoriteOutlined aria-hidden className="text-error" />
        ) : (
          <FavoriteBorderOutlined aria-hidden />
        )}
      </IconButton>
    </Tooltip>
  );
}
