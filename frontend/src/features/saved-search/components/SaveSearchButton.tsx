import BookmarkAddOutlined from '@mui/icons-material/BookmarkAddOutlined';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccess } from '@/features/auth';
import type { SearchFilters } from '@/shared/lib/listingSearch';
import { SaveSearchDialog } from './SaveSearchDialog';

export interface SaveSearchButtonProps {
  filters: SearchFilters;
}

/** Tenants only. The dialog remounts on each opening (a fresh key and form every time). */
export function SaveSearchButton({ filters }: SaveSearchButtonProps) {
  const { t } = useTranslation('savedSearch');
  const can = useAccess();
  const [opening, setOpening] = useState(0);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (!can('listing.save')) {
    return null;
  }
  const close = (): void => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  return (
    <>
      <Button
        ref={triggerRef}
        variant="outlined"
        size="small"
        startIcon={<BookmarkAddOutlined aria-hidden />}
        onClick={() => {
          setOpening((count) => count + 1);
          setOpen(true);
        }}
      >
        {t('button')}
      </Button>
      {open && (
        <SaveSearchDialog
          key={opening}
          open={open}
          filters={filters}
          onClose={close}
          onSaved={() => {
            close();
            setSaved(true);
          }}
        />
      )}
      <Snackbar
        open={saved}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') {
            setSaved(false);
          }
        }}
        message={t('savedToast')}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              setSaved(false);
            }}
          >
            {t('dismiss')}
          </Button>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ content: { role: 'status' } }}
      />
    </>
  );
}
