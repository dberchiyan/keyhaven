import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FormErrorLine, RESERVED_LINE } from '@/features/auth';
import { BrandMark } from '@/shared/components/BrandMark';
import { useStartConversationForm } from '../hooks/useStartConversationForm';
import { isStartConversationMessage, MESSAGE_LIMITS } from '../schemas';

export interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  /** The request was sent: the caller opens it. */
  onStarted: (conversationId: string) => void;
}

/**
 * "Write to Keyhaven": a subject and the first message, nothing else — the thread carries on
 * in the inbox like any other. Remounted per opening (the parent keys it): one Idempotency-Key.
 */
export function NewConversationDialog({ open, onClose, onStarted }: NewConversationDialogProps) {
  const { t } = useTranslation(['message', 'validation']);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();
  const { form, onSubmit, errorCode, errorRef, isPending } = useStartConversationForm(onStarted);
  const { errors, isSubmitting } = form.formState;
  const subjectError = errors.subject?.message;
  const bodyError = errors.body?.message;
  const helper = (message: string | undefined, max: number): string =>
    message ? (isStartConversationMessage(message) ? t(message, { max }) : message) : RESERVED_LINE;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      aria-labelledby={titleId}
      slotProps={{ paper: { className: 'w-full max-w-lg' } }}
    >
      <form noValidate onSubmit={(event) => void onSubmit(event)}>
        <DialogTitle id={titleId} className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          {t('message:new.title')}
        </DialogTitle>
        <DialogContent className="flex flex-col gap-3">
          <Typography variant="body2" color="textSecondary">
            {t('message:new.text')}
          </Typography>
          <TextField
            {...form.register('subject')}
            label={t('message:new.subject')}
            placeholder={t('message:new.subjectPlaceholder')}
            required
            fullWidth
            error={Boolean(subjectError)}
            helperText={helper(subjectError, MESSAGE_LIMITS.subject)}
            slotProps={{ htmlInput: { maxLength: MESSAGE_LIMITS.subject } }}
          />
          <TextField
            {...form.register('body')}
            label={t('message:new.body')}
            placeholder={t('message:new.bodyPlaceholder')}
            required
            fullWidth
            multiline
            minRows={4}
            maxRows={10}
            error={Boolean(bodyError)}
            helperText={helper(bodyError, MESSAGE_LIMITS.body)}
            slotProps={{ htmlInput: { maxLength: MESSAGE_LIMITS.body } }}
          />
          <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting || isPending}>
            {t('message:new.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || isPending}
            aria-busy={isSubmitting || isPending}
          >
            {t('message:new.send')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
