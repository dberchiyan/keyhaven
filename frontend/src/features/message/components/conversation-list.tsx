import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { ErrorState } from '@/shared/components/error-state';
import { RowSkeleton } from '@/shared/components/row-skeleton';
import { conversationPath } from '@/shared/lib/paths';

import { type InboxFilter, useInboxFilter } from '../hooks/use-inbox-filter';
import { useConversations } from '../hooks/use-message-queries';
import { ConversationRow } from './conversation-row';
import { InboxEmpty } from './inbox-empty';
import { InboxHeader } from './inbox-header';
import { NewConversationDialog } from './new-conversation-dialog';

const ROWS = ['a', 'b', 'c', 'd'] as const;

export interface ConversationListProps {
    selectedId: string | undefined;
}

interface InboxRowsProps {
    filter: InboxFilter;
    selectedId: string | undefined;
    now: number;
}

/** The inbox's four states (ARCH-35); rows latest message first, as the server ranks them. */
function InboxRows({ filter, selectedId, now }: InboxRowsProps): ReactElement {
    const { t } = useTranslation('message');
    const inbox = useConversations();
    if (inbox.isPending) {
        return (
            <div role="status" aria-busy="true" className="flex flex-col gap-1 p-3">
                <span className="sr-only">{t('inbox.loading')}</span>
                {ROWS.map((row) => (
                    <RowSkeleton key={row} trailing={false} />
                ))}
            </div>
        );
    }
    if (inbox.isError) {
        return (
            <div className="p-3">
                <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />
            </div>
        );
    }
    const rows = inbox.data.filter((row) => filter === 'all' || row.unread > 0);
    if (rows.length === 0) {
        return <InboxEmpty filter={filter} />;
    }
    return (
        <ul className="m-0 flex list-none flex-col p-0 py-1" aria-label={t('inbox.title')}>
            {rows.map((conversation) => (
                <li key={conversation.id}>
                    <ConversationRow
                        conversation={conversation}
                        isSelected={conversation.id === selectedId}
                        now={now}
                    />
                </li>
            ))}
        </ul>
    );
}

/**
 * The inbox column: its header and the rows. The new-request dialog is keyed by an opening counter
 * rather than shown by a boolean, so each opening remounts it with a fresh form and its own
 * Idempotency-Key (ARCH-33, QRY-12).
 */
export function ConversationList({ selectedId }: ConversationListProps): ReactElement {
    const navigate = useNavigate();
    const inbox = useConversations();
    const { filter, setFilter } = useInboxFilter();
    const [now] = useState(() => Date.now());
    const [opening, setOpening] = useState(0);
    const unreadTotal = inbox.data?.reduce((sum, row) => sum + row.unread, 0) ?? 0;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <InboxHeader
                total={inbox.data?.length}
                unreadTotal={unreadTotal}
                filter={filter}
                onFilterChange={setFilter}
                onWriteToKeyhaven={() => {
                    setOpening((value) => value + 1);
                }}
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
                <InboxRows filter={filter} selectedId={selectedId} now={now} />
            </div>
            {opening > 0 && (
                <NewConversationDialog
                    key={opening}
                    open
                    onClose={() => {
                        setOpening(0);
                    }}
                    onStarted={(conversationId) => {
                        setOpening(0);
                        void navigate(conversationPath(conversationId));
                    }}
                />
            )}
        </div>
    );
}
