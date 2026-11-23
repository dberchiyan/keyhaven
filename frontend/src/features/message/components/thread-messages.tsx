import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDayDivider, groupByDay, type PlacedMessage } from '../format';
import type { ConversationDetail } from '../types';
import { MessageBubble } from './message-bubble';
import { NewMessagesDivider } from './new-messages-divider';

export interface ThreadMessagesProps {
    conversation: ConversationDetail;
    firstNewId: string | undefined;
    now: number;
}

/** Consecutive messages of one run stay together; the "New" line also starts a new block, so it gets its space. */
const splitRuns = (messages: readonly PlacedMessage[], firstNewId: string | undefined): PlacedMessage[][] => {
    const runs: PlacedMessage[][] = [];
    for (const placed of messages) {
        const current = runs[runs.length - 1];
        const startsRun = placed.position === 'single' || placed.position === 'first';
        if (current === undefined || startsRun || placed.message.id === firstNewId) {
            runs.push([placed]);
            continue;
        }
        current.push(placed);
    }
    return runs;
};

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
                <section key={group.day} className="flex flex-col gap-4">
                    <Typography
                        variant="caption"
                        component="div"
                        color="textSecondary"
                        className="self-center rounded-full border border-divider bg-background-paper px-3 py-0.5"
                    >
                        {formatDayDivider(group.messages[0]?.message.createdAt ?? '', now, i18n.language)}
                    </Typography>
                    {splitRuns(group.messages, firstNewId).map((run) => (
                        <div key={run[0]?.message.id} className="flex flex-col gap-4">
                            {run[0]?.message.id === firstNewId && <NewMessagesDivider />}
                            <div className="flex flex-col">
                                {run.map(({ message, position }) => (
                                    <MessageBubble
                                        key={message.id}
                                        message={message}
                                        isOwn={message.side === conversation.side}
                                        position={position}
                                        isSeen={
                                            conversation.seenAt !== null && conversation.seenAt >= message.createdAt
                                        }
                                        {...(isSupport && message.side === 'RESPONDER'
                                            ? { senderLabel: t('thread.staffName', { name: message.sender.firstName }) }
                                            : {})}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            ))}
        </>
    );
}
