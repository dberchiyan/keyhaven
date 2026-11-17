import {
    useMutation,
    type UseMutationResult,
    useQuery,
    useQueryClient,
    type UseQueryResult,
} from '@tanstack/react-query';

import type { ApiError } from '@/shared/api/api-error';
import { MS_PER_SECOND } from '@/shared/lib/units';

import { messageApi } from '../api/message-api';
import type {
    Conversation,
    ConversationDetail,
    ConversationSummary,
    MarkReadVariables,
    Message,
    ReadReceipt,
    SendMessageVariables,
    SetConversationClosedVariables,
    StartConversationVariables,
} from '../types';
import { messageKeys } from './query-keys';

const THREAD_POLL_SECONDS = 10;
const INBOX_POLL_SECONDS = 30;
const SUMMARY_POLL_SECONDS = 60;

/**
 * The inbox. The live channel brings changes at once; polling is only the safety net, and only
 * while the tab is visible (QRY-6).
 */
export const useConversations = (): UseQueryResult<Conversation[], ApiError> =>
    useQuery<Conversation[], ApiError>({
        queryKey: messageKeys.inbox(),
        queryFn: messageApi.list,
        refetchInterval: INBOX_POLL_SECONDS * MS_PER_SECOND,
        refetchIntervalInBackground: false,
    });

/**
 * One thread, polled faster than the inbox while visible (QRY-6). Never served from cache on
 * mount: opening a thread shows what is there now, not what was cached a minute ago.
 */
export const useConversation = (conversationId: string): UseQueryResult<ConversationDetail, ApiError> =>
    useQuery<ConversationDetail, ApiError>({
        queryKey: messageKeys.thread(conversationId),
        queryFn: () => messageApi.find(conversationId),
        refetchInterval: THREAD_POLL_SECONDS * MS_PER_SECOND,
        refetchIntervalInBackground: false,
        staleTime: 0,
        refetchOnMount: 'always',
    });

/** The unread badge, polled while visible as the live channel's safety net (QRY-6). */
export const useUnreadMessages = (enabled = true): UseQueryResult<ConversationSummary, ApiError> =>
    useQuery<ConversationSummary, ApiError>({
        queryKey: messageKeys.summary(),
        queryFn: messageApi.summary,
        refetchInterval: SUMMARY_POLL_SECONDS * MS_PER_SECOND,
        refetchIntervalInBackground: false,
        enabled,
    });

/**
 * Never optimistic, because a message cannot be unsent (QRY-4): the server's row is appended to
 * the open thread at once, then the inbox is read again.
 */
export const useSendMessage = (conversationId: string): UseMutationResult<Message, ApiError, SendMessageVariables> => {
    const queryClient = useQueryClient();
    return useMutation<Message, ApiError, SendMessageVariables>({
        mutationFn: ({ body, key }) => messageApi.send(conversationId, { body }, key),
        onSuccess: async (message) => {
            queryClient.setQueryData<ConversationDetail>(messageKeys.thread(conversationId), (current) =>
                current
                    ? {
                          ...current,
                          messages: [...current.messages, message],
                          messageCount: current.messageCount + 1,
                          lastMessage: {
                              body: message.body,
                              isRemoved: message.isRemoved,
                              side: message.side,
                              createdAt: message.createdAt,
                          },
                      }
                    : current,
            );
            await queryClient.invalidateQueries({ queryKey: messageKeys.inbox() });
        },
    });
};

/** The answer already is the new thread, so it is cached as is and only the inbox is read again (QRY-4). */
export const useStartConversation = (): UseMutationResult<ConversationDetail, ApiError, StartConversationVariables> => {
    const queryClient = useQueryClient();
    return useMutation<ConversationDetail, ApiError, StartConversationVariables>({
        mutationFn: ({ request, key }) => messageApi.start(request, key),
        onSuccess: async (conversation) => {
            queryClient.setQueryData(messageKeys.thread(conversation.id), conversation);
            await queryClient.invalidateQueries({ queryKey: messageKeys.inbox() });
        },
    });
};

export type SetConversationClosedMutation = UseMutationResult<
    ConversationDetail,
    ApiError,
    SetConversationClosedVariables
>;

/** Repeating a close or reopen is a no-op on the server, so a retry is safe; the answer replaces the thread. */
export const useSetConversationClosed = (): SetConversationClosedMutation => {
    const queryClient = useQueryClient();
    return useMutation<ConversationDetail, ApiError, SetConversationClosedVariables>({
        mutationFn: ({ conversationId, isClosed }) => messageApi.setClosed(conversationId, isClosed),
        onSuccess: async (conversation) => {
            queryClient.setQueryData(messageKeys.thread(conversation.id), conversation);
            await queryClient.invalidateQueries({ queryKey: messageKeys.inbox() });
        },
    });
};

/**
 * Reading is a no-op to repeat. The caller passes the read marker as it stood before, so the
 * thread draws its "New" line from the mutation's variables instead of copying server data into
 * state (ARCH-5).
 */
export const useMarkRead = (): UseMutationResult<ReadReceipt, ApiError, MarkReadVariables> => {
    const queryClient = useQueryClient();
    return useMutation<ReadReceipt, ApiError, MarkReadVariables>({
        mutationFn: ({ conversationId }) => messageApi.markRead(conversationId),
        onSuccess: async (receipt, { conversationId }) => {
            queryClient.setQueryData<ConversationDetail>(messageKeys.thread(conversationId), (current) =>
                current ? { ...current, unread: 0, readAt: receipt.readAt } : current,
            );
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: messageKeys.inbox() }),
                queryClient.invalidateQueries({ queryKey: messageKeys.summary() }),
            ]);
        },
    });
};
