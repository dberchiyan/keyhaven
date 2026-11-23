export const LiveEventType = {
    MESSAGE_CREATED: 'message.created',
    MESSAGE_READ: 'message.read',
    VIEWING_CHANGED: 'viewing.changed',
    CONVERSATION_CHANGED: 'conversation.changed',
    PING: 'ping',
} as const;
export type LiveEventType = (typeof LiveEventType)[keyof typeof LiveEventType];

export type LiveEvent =
    | { type: typeof LiveEventType.MESSAGE_CREATED; conversationId: string }
    | { type: typeof LiveEventType.MESSAGE_READ; conversationId: string }
    | { type: typeof LiveEventType.VIEWING_CHANGED; viewingId: string }
    | { type: typeof LiveEventType.CONVERSATION_CHANGED; conversationId: string }
    | { type: typeof LiveEventType.PING };
