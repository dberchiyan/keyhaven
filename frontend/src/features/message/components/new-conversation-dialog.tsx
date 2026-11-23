import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/shared/components/brand-mark';
import { FormErrorLine } from '@/shared/components/form-error-line';
import { useFieldMessage } from '@/shared/hooks/use-field-message';

import { useStartConversationForm } from '../hooks/use-start-conversation-form';
import { MESSAGE_LIMITS } from '../schemas';

export interface NewConversationDialogProps {
    open: boolean;
    onClose: () => void;
    onStarted: (conversationId: string) => void;
}

/**
 * "Write to Keyhaven": a subject and the first message, nothing else — the thread carries on in
 * the inbox like any other. The parent remounts it per opening instead of resetting it in effects
 * (ARCH-33), which also gives each opening its own Idempotency-Key (QRY-12); a full-screen sheet
 * on phones (RESP-4).
 */
export function NewConversationDialog({ open, onClose, onStarted }: NewConversationDialogProps): ReactElement {
    const { t } = useTranslation('message');
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const titleId = useId();
    const { form, onSubmit, errorCode, errorRef, isPending } = useStartConversationForm(onStarted);
    const { errors, isSubmitting } = form.formState;
    const fieldMessage = useFieldMessage();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={fullScreen}
            aria-labelledby={titleId}
            slotProps={{ paper: { className: 'w-full max-w-lg' } }}
        >
            <form noValidate onSubmit={(event) => void onSubmit(event)}>
                <DialogTitle id={titleId} className="flex items-center gap-2">
                    <BrandMark className="size-8" />
                    {t('new.title')}
                </DialogTitle>
                <DialogContent className="flex flex-col gap-4">
                    <Typography variant="body2" color="textSecondary">
                        {t('new.text')}
                    </Typography>
                    <TextField
                        {...form.register('subject')}
                        label={t('new.subject')}
                        placeholder={t('new.subjectPlaceholder')}
                        required
                        fullWidth
                        error={Boolean(errors.subject)}
                        helperText={fieldMessage(errors.subject, { max: MESSAGE_LIMITS.subject })}
                        slotProps={{ htmlInput: { maxLength: MESSAGE_LIMITS.subject } }}
                    />
                    <TextField
                        {...form.register('body')}
                        label={t('new.body')}
                        placeholder={t('new.bodyPlaceholder')}
                        required
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={10}
                        error={Boolean(errors.body)}
                        helperText={fieldMessage(errors.body, { max: MESSAGE_LIMITS.body })}
                        slotProps={{ htmlInput: { maxLength: MESSAGE_LIMITS.body } }}
                    />
                    <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={isSubmitting || isPending}>
                        {t('new.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting || isPending}
                        aria-busy={isSubmitting || isPending}
                    >
                        {t('new.send')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
