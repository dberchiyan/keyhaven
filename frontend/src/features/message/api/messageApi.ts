import { apiClient } from '@/shared/api/client';
import type {
    Conversation,
    ConversationDetail,
    ConversationSummary,
    Message,
    ReadReceipt,
    SendMessageRequest,
    StartConversationRequest,
} from '../types';

const BASE = '/api/v1';
/** Mirrors the backend's `MAX_MESSAGE_LENGTH` / `MAX_SUBJECT_LENGTH` (message-limits.ts). */
export const MESSAGE_MAX = 2000;
export const SUBJECT_MAX = 120;

const encode = (id: string): string => encodeURIComponent(id);

export const messageApi = {
    list: async (): Promise<Conversation[]> =>
        (await apiClient.get<{ content: Conversation[] }>(`${BASE}/conversations`)).data.content,
    summary: async (): Promise<ConversationSummary> =>
        (await apiClient.get<ConversationSummary>(`${BASE}/conversations/summary`)).data,
    find: async (conversationId: string): Promise<ConversationDetail> =>
        (await apiClient.get<ConversationDetail>(`${BASE}/conversations/${encode(conversationId)}/messages`)).data,
    /** One Idempotency-Key per attempt: a retry never posts the message twice. */
    send: async (conversationId: string, request: SendMessageRequest, idempotencyKey: string): Promise<Message> =>
        (
            await apiClient.post<Message>(`${BASE}/conversations/${encode(conversationId)}/messages`, request, {
                headers: { 'Idempotency-Key': idempotencyKey },
            })
        ).data,
    /** A request to Keyhaven; one Idempotency-Key per opening of the dialog. */
    start: async (request: StartConversationRequest, idempotencyKey: string): Promise<ConversationDetail> =>
        (
            await apiClient.post<ConversationDetail>(`${BASE}/conversations`, request, {
                headers: { 'Idempotency-Key': idempotencyKey },
            })
        ).data,
    markRead: async (conversationId: string): Promise<ReadReceipt> =>
        (await apiClient.post<ReadReceipt>(`${BASE}/conversations/${encode(conversationId)}/message-reads`, {})).data,
    /** The staff closes or reopens a request; repeating is a no-op. */
    setClosed: async (conversationId: string, closed: boolean): Promise<ConversationDetail> =>
        (
            await apiClient.post<ConversationDetail>(
                `${BASE}/conversations/${encode(conversationId)}/${closed ? 'closure' : 'reopening'}`,
                {},
            )
        ).data,
};
