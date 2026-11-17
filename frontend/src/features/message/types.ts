import type { Schemas } from '@/shared/types';

export type Conversation = Schemas['Conversation_Output'];
export type ConversationKind = Schemas['ConversationKind_Output'];
export type ConversationDetail = Schemas['ConversationDetailResponse_Output'];
export type Message = Schemas['Message_Output'];
export type MessageSide = Schemas['MessageSide_Output'];
export type ConversationSummary = Schemas['ConversationSummaryResponse_Output'];
export type ReadReceipt = Schemas['ReadReceiptResponse_Output'];
export type SendMessageRequest = Schemas['SendMessageRequest'];
export type StartConversationRequest = Schemas['StartConversationRequest'];

export interface SendMessageVariables {
    body: string;
    key: string;
}

export interface StartConversationVariables {
    request: StartConversationRequest;
    key: string;
}

export interface SetConversationClosedVariables {
    conversationId: string;
    isClosed: boolean;
}

export interface MarkReadVariables {
    conversationId: string;
    readAtBefore: ConversationDetail['readAt'];
}
