import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactElement, useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface SuspendListingDialogProps {
    open: boolean;
    title: string;
    isPending: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Names the consequence of an irreversible action; Cancel, the safe choice, takes the focus once
 * the dialog has mounted (FORM-5, A11Y-3).
 */
export function SuspendListingDialog({
    open,
    title,
    isPending,
    onCancel,
    onConfirm,
}: SuspendListingDialogProps): ReactElement {
    const { t } = useTranslation('listing');
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
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
            fullScreen={fullScreen}
            aria-labelledby={titleId}
            aria-describedby={textId}
        >
            <DialogTitle id={titleId}>{t('managed.confirmSuspend.title')}</DialogTitle>
            <DialogContent>
                <DialogContentText id={textId}>{t('managed.confirmSuspend.text', { title })}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button ref={cancelRef} onClick={onCancel} disabled={isPending}>
                    {t('managed.confirmSuspend.cancel')}
                </Button>
                <Button variant="contained" color="error" onClick={onConfirm} loading={isPending}>
                    {t('managed.confirmSuspend.confirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
