import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { type ReactElement, useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface EndOtherSessionsDialogProps {
    open: boolean;
    count: number;
    isPending: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Confirms signing out every other device; the safe "Keep" button takes focus first (FORM-5,
 * A11Y-3) and the confirm button names how many sessions end (QRY-23).
 */
export function EndOtherSessionsDialog({
    open,
    count,
    isPending,
    onCancel,
    onConfirm,
}: EndOtherSessionsDialogProps): ReactElement {
    const { t } = useTranslation('settings');
    const titleId = useId();
    const keepRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => keepRef.current?.focus());
        }
    }, [open]);

    return (
        <Dialog
            open={open}
            onClose={() => {
                if (!isPending) {
                    onCancel();
                }
            }}
            maxWidth="xs"
            fullWidth
            aria-labelledby={titleId}
        >
            <DialogTitle id={titleId}>{t('sessions.confirmTitle')}</DialogTitle>
            <DialogContent>
                <DialogContentText>{t('sessions.confirmText', { count })}</DialogContentText>
            </DialogContent>
            <DialogActions className="px-4 py-3 sm:px-6">
                <Button ref={keepRef} onClick={onCancel} disabled={isPending}>
                    {t('sessions.keep')}
                </Button>
                <Button variant="contained" color="error" loading={isPending} onClick={onConfirm}>
                    {t('sessions.confirm', { count })}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
