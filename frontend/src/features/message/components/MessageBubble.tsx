import DoneAllOutlined from '@mui/icons-material/DoneAllOutlined';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { formatMessageTime, type RunPosition } from '../format';
import type { Message } from '../types';

export interface MessageBubbleProps {
  message: Message;
  /** Written by the reader's own side (the right, in the brand tone). */
  own: boolean;
  /** Where it sits in a run of the same sender: the name heads a run, the time ends it. */
  position: RunPosition;
  /** The other side read the thread after this message (own messages only). */
  seen: boolean;
  /** What to call the sender instead of their full name (the staff: "Alex · Keyhaven"). */
  senderLabel?: string;
}

/** Literal class names so Tailwind sees them: the corner towards the next bubble of a run is tight. */
const CORNERS: Record<'own' | 'other', Record<RunPosition, string>> = {
  own: {
    single: 'rounded-br-sm',
    first: 'rounded-br-sm',
    middle: 'rounded-r-sm',
    last: 'rounded-tr-sm',
  },
  other: {
    single: 'rounded-bl-sm',
    first: 'rounded-bl-sm',
    middle: 'rounded-l-sm',
    last: 'rounded-tl-sm',
  },
};

/**
 * One message: the text; the sender's name above the first of the other side's run, the time
 * (and "Seen" for one's own) under the last of a run.
 */
export function MessageBubble({ message, own, position, seen, senderLabel }: MessageBubbleProps) {
  const { t, i18n } = useTranslation('message');
  const time = formatMessageTime(message.createdAt, i18n.language);
  const headsRun = position === 'single' || position === 'first';
  const endsRun = position === 'single' || position === 'last';
  return (
    <div
      className={cn(
        'flex max-w-[85%] flex-col gap-0.5 md:max-w-[70%]',
        own && 'self-end',
        headsRun && 'mt-2',
      )}
    >
      {/* The arbitrary widths: a bubble never spans the pane, as every chat reads. */}
      {headsRun && !own && (
        <Typography variant="caption" color="textSecondary" className="px-3">
          {senderLabel ?? `${message.sender.firstName} ${message.sender.lastName}`}
        </Typography>
      )}
      <div
        className={cn(
          'rounded-xl px-3.5 py-2',
          own
            ? 'bg-primary text-primary-contrast-text'
            : 'border border-divider bg-background-paper',
          CORNERS[own ? 'own' : 'other'][position],
        )}
        title={time}
      >
        <Typography variant="body2" component="p" className="break-words whitespace-pre-line">
          {message.body}
        </Typography>
      </div>
      {endsRun && (
        <Typography
          variant="caption"
          color="textSecondary"
          className={cn('app-tabular inline-flex items-center gap-1 px-3', own && 'self-end')}
        >
          <time dateTime={message.createdAt}>{time}</time>
          {own && seen && (
            <>
              <DoneAllOutlined aria-hidden fontSize="inherit" className="text-primary" />
              <span>{t('thread.seen')}</span>
            </>
          )}
        </Typography>
      )}
    </div>
  );
}
