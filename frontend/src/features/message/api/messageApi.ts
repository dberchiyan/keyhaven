import { apiClient } from '@/shared/api/client';
import type {
  Conversation,
  ConversationDetail,
  ConversationSummary,
  Message,
  ReadReceipt,
  SendMessageRequest,
} from '../types';

const BASE = '/api/v1';
/** Mirrors the backend's `MAX_MESSAGE_LENGTH` (message.request.ts). */
export const MESSAGE_MAX = 2000;

const encode = (id: string): string => encodeURIComponent(id);

export const messageApi = {
  list: async (): Promise<Conversation[]> =>
    (await apiClient.get<{ content: Conversation[] }>(`${BASE}/conversations`)).data.content,
  summary: async (): Promise<ConversationSummary> =>
    (await apiClient.get<ConversationSummary>(`${BASE}/conversations/summary`)).data,
  find: async (viewingId: string): Promise<ConversationDetail> =>
    (await apiClient.get<ConversationDetail>(`${BASE}/viewings/${encode(viewingId)}/messages`))
      .data,
  /** One Idempotency-Key per attempt: a retry never posts the message twice. */
  send: async (
    viewingId: string,
    request: SendMessageRequest,
    idempotencyKey: string,
  ): Promise<Message> =>
    (
      await apiClient.post<Message>(`${BASE}/viewings/${encode(viewingId)}/messages`, request, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
    ).data,
  markRead: async (viewingId: string): Promise<ReadReceipt> =>
    (await apiClient.post<ReadReceipt>(`${BASE}/viewings/${encode(viewingId)}/message-reads`, {}))
      .data,
};
