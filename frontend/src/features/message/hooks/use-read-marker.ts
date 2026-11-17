import { useEffect } from 'react';

import type { ConversationDetail } from '../types';
import { useMarkRead } from './use-message-queries';

/**
 * Marks what arrived unread as read once it is on screen — on opening and whenever new unread
 * messages come while the thread is open. A read receipt is a mutation, not a fetch, so an effect
 * may send it (ARCH-5). Returns the first message from the other side after the marker as it stood
 * before, which gets the "New" line; it comes from the mutation's variables, so nothing is copied
 * into state.
 */
export const useReadMarker = (
    conversationId: string,
    conversation: ConversationDetail | undefined,
): string | undefined => {
    const markRead = useMarkRead();
    const markReadMutate = markRead.mutate;
    const unread = conversation?.unread ?? 0;
    const readAt = conversation?.readAt ?? null;

    useEffect(() => {
        if (unread > 0) {
            markReadMutate({ conversationId, readAtBefore: readAt });
        }
    }, [unread, readAt, conversationId, markReadMutate]);

    if (markRead.variables === undefined || conversation === undefined) {
        return undefined;
    }
    const newSince = markRead.variables.readAtBefore;
    return conversation.messages.find(
        (message) => message.side !== conversation.side && (newSince === null || message.createdAt > newSince),
    )?.id;
};
