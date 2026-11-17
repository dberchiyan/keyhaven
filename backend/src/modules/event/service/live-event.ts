/** What the server tells a signed-in browser as it happens; ids only, the client reads the rest. */
export const LiveEventType = {
    /** A message arrived in one of the caller's conversations. */
    MESSAGE_CREATED: 'message.created',
    /** The other side read a conversation (the caller's messages are "seen"). */
    MESSAGE_READ: 'message.read',
    /** A viewing of the caller's was requested, answered, cancelled or expired. */
    VIEWING_CHANGED: 'viewing.changed',
    /** A support request of the caller's was closed or reopened. */
    CONVERSATION_CHANGED: 'conversation.changed',
    /** Keeps the connection open through proxies; carries nothing. */
    PING: 'ping',
} as const;
export type LiveEventType = (typeof LiveEventType)[keyof typeof LiveEventType];

export type LiveEvent =
    | { type: typeof LiveEventType.MESSAGE_CREATED; conversationId: string }
    | { type: typeof LiveEventType.MESSAGE_READ; conversationId: string }
    | { type: typeof LiveEventType.VIEWING_CHANGED; viewingId: string }
    | { type: typeof LiveEventType.CONVERSATION_CHANGED; conversationId: string }
    | { type: typeof LiveEventType.PING };
