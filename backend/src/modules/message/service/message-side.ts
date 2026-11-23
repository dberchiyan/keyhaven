export const MessageSide = { REQUESTER: 'REQUESTER', RESPONDER: 'RESPONDER' } as const;
export type MessageSide = (typeof MessageSide)[keyof typeof MessageSide];
export const MESSAGE_SIDES = Object.values(MessageSide) as [MessageSide, ...MessageSide[]];

export const isMessageSide = (value: string): value is MessageSide =>
    (MESSAGE_SIDES as readonly string[]).includes(value);

export const otherSide = (side: MessageSide): MessageSide =>
    side === MessageSide.REQUESTER ? MessageSide.RESPONDER : MessageSide.REQUESTER;

export const ConversationKind = { VIEWING: 'VIEWING', SUPPORT: 'SUPPORT' } as const;
export type ConversationKind = (typeof ConversationKind)[keyof typeof ConversationKind];
export const CONVERSATION_KINDS = Object.values(ConversationKind) as [ConversationKind, ...ConversationKind[]];

export const CounterpartKind = {
    TENANT: 'TENANT',
    LANDLORD: 'LANDLORD',
    AGENT: 'AGENT',
    AGENCY: 'AGENCY',
    KEYHAVEN: 'KEYHAVEN',
} as const;
export type CounterpartKind = (typeof CounterpartKind)[keyof typeof CounterpartKind];
export const COUNTERPART_KINDS = Object.values(CounterpartKind) as [CounterpartKind, ...CounterpartKind[]];
