import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { type ReactElement, useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface CloseHoursDialogProps {
    open: boolean;
    isPending: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Names what closing the hours does before it happens, with Cancel focused first (FORM-5, A11Y-3);
 * focus moves after the dialog has mounted, so the trap does not take it back.
 */
export function CloseHoursDialog({ open, isPending, onCancel, onConfirm }: CloseHoursDialogProps): ReactElement {
    const { t } = useTranslation('viewing');
    const titleId = useId();
    const textId = useId();
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => {
                cancelRef.current?.focus();
            });
        }
    }, [open]);

    return (
        <Dialog
            open={open}
            onClose={isPending ? undefined : onCancel}
            aria-labelledby={titleId}
            aria-describedby={textId}
        >
            <DialogTitle id={titleId}>{t('hours.closeTitle')}</DialogTitle>
            <DialogContent>
                <DialogContentText id={textId}>{t('hours.closeText')}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button ref={cancelRef} disabled={isPending} onClick={onCancel}>
                    {t('hours.closeCancel')}
                </Button>
                <Button variant="contained" color="error" loading={isPending} onClick={onConfirm}>
                    {t('hours.closeConfirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
