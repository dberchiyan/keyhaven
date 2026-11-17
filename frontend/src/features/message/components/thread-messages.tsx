import Typography from '@mui/material/Typography';
import { Fragment, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDayDivider, groupByDay } from '../format';
import type { ConversationDetail } from '../types';
import { MessageBubble } from './message-bubble';
import { NewMessagesDivider } from './new-messages-divider';

export interface ThreadMessagesProps {
    conversation: ConversationDetail;
    firstNewId: string | undefined;
    now: number;
}

/**
 * The messages by the reader's local day, in runs; "Seen" follows the other side's read marker,
 * and the staff's answers carry "Alex · Keyhaven" instead of a person's full name.
 */
export function ThreadMessages({ conversation, firstNewId, now }: ThreadMessagesProps): ReactElement {
    const { t, i18n } = useTranslation('message');
    const isSupport = conversation.kind === 'SUPPORT';
    return (
        <>
            {groupByDay(conversation.messages).map((group) => (
                <Fragment key={group.day}>
                    <Typography
                        variant="caption"
                        component="div"
                        color="textSecondary"
                        className="my-3 self-center rounded-full border border-divider bg-background-paper px-3 py-0.5"
                    >
                        {formatDayDivider(group.messages[0]?.message.createdAt ?? '', now, i18n.language)}
                    </Typography>
                    {group.messages.map(({ message, position }) => (
                        <Fragment key={message.id}>
                            {message.id === firstNewId && <NewMessagesDivider />}
                            <MessageBubble
                                message={message}
                                isOwn={message.side === conversation.side}
                                position={position}
                                isSeen={conversation.seenAt !== null && conversation.seenAt >= message.createdAt}
                                {...(isSupport && message.side === 'RESPONDER'
                                    ? { senderLabel: t('thread.staffName', { name: message.sender.firstName }) }
                                    : {})}
                            />
                        </Fragment>
                    ))}
                </Fragment>
            ))}
        </>
    );
}
