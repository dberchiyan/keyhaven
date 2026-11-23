import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess } from '@/features/auth';
import { ErrorState } from '@/shared/components/error-state';
import { listingPath, managedListingPath } from '@/shared/lib/paths';

import { splitName } from '../format';
import { useConversation, useSetConversationClosed } from '../hooks/use-message-queries';
import { useReadMarker } from '../hooks/use-read-marker';
import { useThreadScroll } from '../hooks/use-thread-scroll';
import { ConversationContextBar } from './conversation-context-bar';
import { ConversationHeader } from './conversation-header';
import { EmptyThread } from './empty-thread';
import { MessageComposer } from './message-composer';
import { ThreadMessages } from './thread-messages';

export interface ConversationPaneProps {
    conversationId: string;
}

/**
 * One conversation: its header, the context strip, the messages (a "New" line above what was
 * unread on opening) and the composer while it is open. New messages are announced politely
 * (A11Y-5) and never pull a reader who scrolled up; a pill counts them instead. `now` is taken
 * once per mount so relative times do not drift between renders.
 */
export function ConversationPane({ conversationId }: ConversationPaneProps): ReactElement {
    const { t } = useTranslation(['message', 'errors']);
    const { canAccess } = useAccess();
    const thread = useConversation(conversationId);
    const setClosed = useSetConversationClosed();
    const firstNewId = useReadMarker(conversationId, thread.data);
    const { listRef, behindCount, onScroll, scrollToEnd } = useThreadScroll(thread.data?.messages.length ?? 0);
    const [now] = useState(() => Date.now());

    if (thread.isPending) {
        return (
            <div role="status" aria-busy="true" className="flex flex-col gap-4 p-4">
                <span className="sr-only">{t('message:thread.loading')}</span>
                <Skeleton variant="rounded" className="h-14 w-full" />
                <Skeleton variant="rounded" className="h-10 w-3/5 self-end" />
                <Skeleton variant="rounded" className="h-10 w-2/3" />
            </div>
        );
    }
    if (thread.isError) {
        return (
            <div className="p-4">
                <ErrorState error={thread.error} onRetry={() => void thread.refetch()} />
            </div>
        );
    }
    const conversation = thread.data;
    const { listing } = conversation;
    const listingHref = canAccess('home.manage') ? managedListingPath : listingPath;
    const homeHref = listing ? listingHref(listing.id) : undefined;
    const closedSupportText = canAccess('message.manage')
        ? t('message:thread.closedSupportStaff')
        : t('message:thread.closedSupport');
    const closedText = conversation.kind === 'SUPPORT' ? closedSupportText : t('message:thread.closed');

    return (
        <div className="flex h-full min-h-0 flex-col">
            <ConversationHeader conversation={conversation} homeHref={homeHref} now={now} setClosed={setClosed} />
            <ConversationContextBar conversation={conversation} homeHref={homeHref} now={now} />
            <div className="relative flex min-h-0 flex-1 flex-col">
                <div
                    ref={listRef}
                    onScroll={onScroll}
                    className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4 md:px-5"
                    aria-live="polite"
                    aria-label={t('message:thread.messages')}
                >
                    {conversation.messages.length === 0 ? (
                        <EmptyThread conversation={conversation} closedText={closedText} />
                    ) : (
                        <ThreadMessages conversation={conversation} firstNewId={firstNewId} now={now} />
                    )}
                </div>
                {behindCount > 0 && (
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<ArrowDownwardOutlined aria-hidden />}
                        onClick={scrollToEnd}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md"
                    >
                        {t('message:thread.behind', { count: behindCount })}
                    </Button>
                )}
            </div>
            {setClosed.isError && (
                <div className="px-3 md:px-4">
                    <Alert severity="error" role="alert">
                        {t(`errors:${setClosed.error.code}`)}
                    </Alert>
                </div>
            )}
            {conversation.isOpen ? (
                <MessageComposer
                    conversationId={conversation.id}
                    counterpart={splitName(conversation.counterpart.name).firstName}
                />
            ) : (
                <div className="p-3 md:p-4">
                    <Alert severity="info" icon={false}>
                        {closedText}
                    </Alert>
                </div>
            )}
        </div>
    );
}
