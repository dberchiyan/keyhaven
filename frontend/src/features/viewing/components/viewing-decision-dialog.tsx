import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RESERVED_LINE } from '@/shared/hooks/use-field-message';

const NOTE_MAX = 300;
const NOTE_COUNTDOWN_FROM = 40;

export interface ViewingDecisionDialogProps {
    open: boolean;
    kind: 'decline' | 'cancel';
    subject: string;
    isPending: boolean;
    onCancel: () => void;
    onConfirm: (note: string) => void;
}

/**
 * Declining a request or calling a viewing off: names the consequence and takes an optional note
 * for the other side; Cancel, the safe choice, takes focus first (FORM-5, A11Y-3). The parent
 * mounts it per opening, so the note always starts empty (ARCH-33).
 */
export function ViewingDecisionDialog({
    open,
    kind,
    subject,
    isPending,
    onCancel,
    onConfirm,
}: ViewingDecisionDialogProps): ReactElement {
    const { t } = useTranslation('viewing');
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const titleId = useId();
    const textId = useId();
    const cancelRef = useRef<HTMLButtonElement>(null);
    const [note, setNote] = useState('');

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
            <DialogTitle id={titleId}>{t(`decision.${kind}.title`)}</DialogTitle>
            <DialogContent className="flex flex-col gap-3">
                <DialogContentText id={textId}>{t(`decision.${kind}.text`, { subject })}</DialogContentText>
                <TextField
                    label={t('decision.note')}
                    multiline
                    minRows={2}
                    fullWidth
                    value={note}
                    onChange={(event) => {
                        setNote(event.target.value.slice(0, NOTE_MAX));
                    }}
                    helperText={
                        note.length > NOTE_MAX - NOTE_COUNTDOWN_FROM
                            ? t('decision.noteLeft', { count: NOTE_MAX - note.length })
                            : RESERVED_LINE
                    }
                    slotProps={{ htmlInput: { maxLength: NOTE_MAX } }}
                />
            </DialogContent>
            <DialogActions>
                <Button ref={cancelRef} onClick={onCancel} disabled={isPending}>
                    {t('decision.back')}
                </Button>
                <Button
                    variant="contained"
                    color={kind === 'decline' ? 'error' : 'primary'}
                    onClick={() => {
                        onConfirm(note.trim());
                    }}
                    loading={isPending}
                >
                    {t(`decision.${kind}.confirm`)}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
