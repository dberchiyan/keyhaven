import BookmarkAddOutlined from '@mui/icons-material/BookmarkAddOutlined';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { type ReactElement, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import { type LoginLocationState, useAccess, useCurrentUser } from '@/features/auth';
import type { SearchFilters } from '@/shared/lib/listing-search';
import { PATHS } from '@/shared/lib/paths';

import { SaveSearchDialog } from './save-search-dialog';

export interface SaveSearchButtonProps {
    filters: SearchFilters;
}

/**
 * Tenants save; a visitor is taken to sign in and comes back to this search; people who list
 * homes see no button. The dialog remounts on each opening (a fresh key and form every time).
 */
export function SaveSearchButton({ filters }: SaveSearchButtonProps): ReactElement | null {
    const { t } = useTranslation('savedSearch');
    const { canAccess } = useAccess();
    const { data: user } = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [opening, setOpening] = useState(0);
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    if (user && !canAccess('listing.save')) {
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
                    if (!user) {
                        const state: LoginLocationState = {
                            from: `${location.pathname}${location.search}${location.hash}`,
                        };
                        void navigate(PATHS.login, { state });
                        return;
                    }
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
