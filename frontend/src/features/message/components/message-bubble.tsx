import DoneAllOutlined from '@mui/icons-material/DoneAllOutlined';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

import { formatMessageTime, type RunPosition } from '../format';
import type { Message } from '../types';

export interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    position: RunPosition;
    isSeen: boolean;
    senderLabel?: string;
}

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
 * One message. Within a run of the same sender the name shows once (the other side's only — one's
 * own sit on the right in the brand tone), the time and "Seen" once at its end, and the corner
 * towards the next bubble is tight, so a run reads as one turn. A bubble never spans the pane, as
 * in every chat. A message whose writer erased their account (DATA-23) keeps its place and reads
 * "removed", muted and in italics.
 */
export function MessageBubble({ message, isOwn, position, isSeen, senderLabel }: MessageBubbleProps): ReactElement {
    const { t, i18n } = useTranslation('message');
    const time = formatMessageTime(message.createdAt, i18n.language);
    const headsRun = position === 'single' || position === 'first';
    const endsRun = position === 'single' || position === 'last';
    return (
        <div className={cn('flex max-w-17/20 flex-col gap-0.5 md:max-w-7/10', isOwn && 'self-end', headsRun && 'mt-2')}>
            {headsRun && !isOwn && (
                <Typography variant="caption" color="textSecondary" className="px-3">
                    {senderLabel ?? `${message.sender.firstName} ${message.sender.lastName}`}
                </Typography>
            )}
            <div
                className={cn(
                    'rounded-xl px-3.5 py-2',
                    isOwn ? 'bg-primary text-primary-contrast-text' : 'border border-divider bg-background-paper',
                    CORNERS[isOwn ? 'own' : 'other'][position],
                )}
                title={time}
            >
                <Typography
                    variant="body2"
                    component="p"
                    color={message.isRemoved && !isOwn ? 'textSecondary' : undefined}
                    className={cn('break-words whitespace-pre-line', message.isRemoved && 'italic')}
                >
                    {message.isRemoved ? t('thread.removed') : message.body}
                </Typography>
            </div>
            {endsRun && (
                <Typography
                    variant="caption"
                    color="textSecondary"
                    className={cn('app-tabular inline-flex items-center gap-1 px-3', isOwn && 'self-end')}
                >
                    <time dateTime={message.createdAt}>{time}</time>
                    {isOwn && isSeen && (
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
