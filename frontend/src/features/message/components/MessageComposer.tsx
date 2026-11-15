import SendOutlined from '@mui/icons-material/SendOutlined';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { RESERVED_LINE } from '@/features/auth';
import { MESSAGE_MAX } from '../api/messageApi';
import { useComposer } from '../hooks/useComposer';

export interface MessageComposerProps {
  conversationId: string;
  /** Who reads it — the placeholder names them. */
  counterpart: string;
}

/**
 * The writing box: a growing text field, a send button, the server's answer on a reserved line,
 * the count when the limit nears. With a keyboard, Enter sends and Shift+Enter breaks a line (a
 * hint says so); on a touch screen Enter is a new line and the button sends, as every chat does.
 */
export function MessageComposer({ conversationId, counterpart }: MessageComposerProps) {
  const { t } = useTranslation(['message', 'errors']);
  const { draft, setDraft, submit, isPending, errorCode, remaining, errorRef } =
    useComposer(conversationId);
  // Behaviour CSS cannot express (ux.md): which key sends.
  const isTouch = useMediaQuery('(pointer: coarse)');
  const nearLimit = remaining < 100;
  return (
    <form
      noValidate
      aria-label={t('message:composer.label')}
      className="flex flex-col gap-1 border-t border-divider p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2">
        <TextField
          label={t('message:composer.field')}
          placeholder={t('message:composer.placeholder', { name: counterpart })}
          multiline
          minRows={1}
          maxRows={6}
          fullWidth
          size="small"
          value={draft}
          disabled={isPending}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (
              !isTouch &&
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit();
            }
          }}
          slotProps={{
            htmlInput: {
              maxLength: MESSAGE_MAX,
              'aria-describedby': `${conversationId}-composer-hint`,
            },
            inputLabel: { className: 'sr-only' },
          }}
        />
        <IconButton
          type="submit"
          color="primary"
          aria-label={t('message:composer.send')}
          loading={isPending}
          disabled={draft.trim().length === 0}
          className="disabled:bg-action-disabled-background disabled:text-action-disabled shrink-0 bg-primary text-primary-contrast-text hover:bg-primary-dark"
        >
          <SendOutlined aria-hidden fontSize="small" />
        </IconButton>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <Typography
          ref={errorRef}
          tabIndex={-1}
          variant="caption"
          color={errorCode ? 'error' : 'textSecondary'}
          role={errorCode ? 'alert' : undefined}
          id={`${conversationId}-composer-hint`}
          className="outline-none"
        >
          {errorCode
            ? t(`errors:${errorCode}`)
            : isTouch
              ? RESERVED_LINE
              : t('message:composer.hint')}
        </Typography>
        <Typography
          variant="caption"
          color={remaining < 0 ? 'error' : 'textSecondary'}
          className="app-tabular shrink-0"
          aria-live={nearLimit ? 'polite' : undefined}
        >
          {nearLimit ? t('message:composer.remaining', { count: remaining }) : RESERVED_LINE}
        </Typography>
      </div>
    </form>
  );
}
