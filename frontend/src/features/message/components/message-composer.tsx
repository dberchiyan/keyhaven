import SendOutlined from '@mui/icons-material/SendOutlined';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { RESERVED_LINE } from '@/shared/hooks/use-field-message';

import { MESSAGE_MAX } from '../api/message-api';
import { useComposer } from '../hooks/use-composer';

const COUNTDOWN_FROM_CHARS = 100;
const MAX_ROWS = 6;

export interface MessageComposerProps {
    conversationId: string;
    counterpart: string;
}

/**
 * The writing box. With a keyboard, Enter sends and Shift+Enter breaks a line (a hint says so); on
 * a touch screen Enter is a new line and the button sends, as every chat does — which key sends is
 * behaviour CSS cannot express, hence `useMediaQuery` (RESP-7). The server's answer and the
 * countdown sit on reserved lines, so the box never shifts (FORM-2); the countdown is polite
 * (A11Y-5).
 */
export function MessageComposer({ conversationId, counterpart }: MessageComposerProps): ReactElement {
    const { t } = useTranslation(['message', 'errors']);
    const { draft, setDraft, submit, isPending, errorCode, remaining, errorRef } = useComposer(conversationId);
    const isTouch = useMediaQuery('(pointer: coarse)');
    const isNearLimit = remaining < COUNTDOWN_FROM_CHARS;
    const keyHint = isTouch ? RESERVED_LINE : t('message:composer.hint');
    return (
        <form
            noValidate
            aria-label={t('message:composer.label')}
            className="flex flex-col gap-2 border-t border-divider p-3"
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
                    maxRows={MAX_ROWS}
                    fullWidth
                    size="small"
                    value={draft}
                    disabled={isPending}
                    onChange={(event) => {
                        setDraft(event.target.value);
                    }}
                    onKeyDown={(event) => {
                        if (!isTouch && event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
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
                    className="shrink-0 bg-primary text-primary-contrast-text hover:bg-primary-dark disabled:bg-action-disabled-background disabled:text-action-disabled"
                >
                    <SendOutlined aria-hidden fontSize="small" />
                </IconButton>
            </div>
            <div className="flex items-baseline justify-between gap-4">
                <Typography
                    ref={errorRef}
                    tabIndex={-1}
                    variant="caption"
                    color={errorCode ? 'error' : 'textSecondary'}
                    role={errorCode ? 'alert' : undefined}
                    id={`${conversationId}-composer-hint`}
                    className="outline-none"
                >
                    {errorCode ? t(`errors:${errorCode}`) : keyHint}
                </Typography>
                <Typography
                    variant="caption"
                    color={remaining < 0 ? 'error' : 'textSecondary'}
                    className="app-tabular shrink-0"
                    aria-live={isNearLimit ? 'polite' : undefined}
                >
                    {isNearLimit ? t('message:composer.remaining', { count: remaining }) : RESERVED_LINE}
                </Typography>
            </div>
        </form>
    );
}
