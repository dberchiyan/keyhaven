/** Who wrote a message — mirrored by ck_viewing_messages_side. The owner's side is one inbox: the landlord, or every agent of the agency. */
export const MessageSide = { TENANT: 'TENANT', OWNER: 'OWNER' } as const;
export type MessageSide = (typeof MessageSide)[keyof typeof MessageSide];
export const MESSAGE_SIDES = Object.values(MessageSide) as [MessageSide, ...MessageSide[]];

export const isMessageSide = (value: string): value is MessageSide =>
  (MESSAGE_SIDES as readonly string[]).includes(value);

export const otherSide = (side: MessageSide): MessageSide =>
  side === MessageSide.TENANT ? MessageSide.OWNER : MessageSide.TENANT;

/** Who the caller talks to: a tenant, or the home's landlord or agency. */
export const CounterpartKind = {
  TENANT: 'TENANT',
  LANDLORD: 'LANDLORD',
  AGENCY: 'AGENCY',
} as const;
export type CounterpartKind = (typeof CounterpartKind)[keyof typeof CounterpartKind];
export const COUNTERPART_KINDS = Object.values(CounterpartKind) as [
  CounterpartKind,
  ...CounterpartKind[],
];
