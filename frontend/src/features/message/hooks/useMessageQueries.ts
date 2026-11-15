import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api/apiError';
import { messageApi } from '../api/messageApi';
import type { ConversationDetail, Message, ReadReceipt, StartConversationRequest } from '../types';
import { messageKeys } from './queryKeys';

/** The live channel brings changes at once; these intervals are the safety net (visible tabs only). */
const THREAD_POLL_MS = 10_000;
const INBOX_POLL_MS = 30_000;
const SUMMARY_POLL_MS = 60_000;

export const useConversations = () =>
  useQuery({
    queryKey: messageKeys.inbox(),
    queryFn: messageApi.list,
    refetchInterval: INBOX_POLL_MS,
    refetchIntervalInBackground: false,
  });

export const useConversation = (conversationId: string) =>
  useQuery({
    queryKey: messageKeys.thread(conversationId),
    queryFn: () => messageApi.find(conversationId),
    refetchInterval: THREAD_POLL_MS,
    refetchIntervalInBackground: false,
    // Opening a thread shows what is there now, not what was cached a minute ago.
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useUnreadMessages = (enabled = true) =>
  useQuery({
    queryKey: messageKeys.summary(),
    queryFn: messageApi.summary,
    refetchInterval: SUMMARY_POLL_MS,
    refetchIntervalInBackground: false,
    enabled,
  });

/**
 * Never optimistic (a message cannot be unsent): the server's row is appended to the open thread
 * at once, then the inbox and the badge are read again.
 */
export const useSendMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation<Message, ApiError, { body: string; key: string }>({
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

/** A new request to Keyhaven: the thread is cached from the answer, the inbox read again. */
export const useStartConversation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    ConversationDetail,
    ApiError,
    { request: StartConversationRequest; key: string }
  >({
    mutationFn: ({ request, key }) => messageApi.start(request, key),
    onSuccess: async (conversation) => {
      queryClient.setQueryData(messageKeys.thread(conversation.id), conversation);
      await queryClient.invalidateQueries({ queryKey: messageKeys.inbox() });
    },
  });
};

/** The staff closes or reopens a request (a no-op to repeat); the thread and the inbox follow. */
export const useSetConversationClosed = () => {
  const queryClient = useQueryClient();
  return useMutation<ConversationDetail, ApiError, { conversationId: string; closed: boolean }>({
    mutationFn: ({ conversationId, closed }) => messageApi.setClosed(conversationId, closed),
    onSuccess: async (conversation) => {
      queryClient.setQueryData(messageKeys.thread(conversation.id), conversation);
      await queryClient.invalidateQueries({ queryKey: messageKeys.inbox() });
    },
  });
};

/**
 * Reading is a no-op to repeat; the inbox row and the badge lose their count. The caller passes
 * the read marker as it stood before — the thread draws its "New" line from the mutation's
 * variables, so nothing has to be copied into state.
 */
export const useMarkRead = () => {
  const queryClient = useQueryClient();
  return useMutation<
    ReadReceipt,
    ApiError,
    { conversationId: string; readAtBefore: string | null }
  >({
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
