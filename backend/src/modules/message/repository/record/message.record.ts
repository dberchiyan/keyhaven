import type { Prisma } from '../../../../generated/prisma/client';

/** Only finished uploads are shown (the listing module's rule). */
const readyPhotos = { status: 'READY' } as const;

const listingSelect = {
  id: true,
  title: true,
  neighborhood: true,
  addressLine1: true,
  addressLine2: true,
  landlordId: true,
  agencyId: true,
  city: { select: { name: true, state: true, timeZone: true } },
  // Bounded: the cover only.
  photos: {
    where: readyPhotos,
    select: { url: true, storageKey: true },
    orderBy: { position: 'asc' },
    take: 1,
  },
  landlord: { select: { firstName: true, lastName: true, email: true } },
  agency: { select: { name: true, email: true } },
} satisfies Prisma.ListingSelect;

/** The thread's markers with its latest message (the inbox row's preview). */
const threadSelect = {
  lastMessageAt: true,
  messageCount: true,
  requesterReadAt: true,
  responderReadAt: true,
  messages: {
    select: { body: true, side: true, createdAt: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 1,
  },
} satisfies Prisma.ConversationSelect;

/** A viewing with what its conversation shows: the home (cover, place, address, owner's inbox), the tenant, the thread. */
export const viewingConversationSelect = {
  id: true,
  status: true,
  startsAt: true,
  endsAt: true,
  tenantId: true,
  listing: { select: listingSelect },
  tenant: { select: { id: true, firstName: true, lastName: true, email: true } },
  conversation: { select: threadSelect },
} satisfies Prisma.ViewingSelect;
export type ViewingConversationRecord = Prisma.ViewingGetPayload<{
  select: typeof viewingConversationSelect;
}>;

/** A support request: who opened it, what about, the home if any, the thread. */
export const supportConversationSelect = {
  id: true,
  subject: true,
  closedAt: true,
  createdAt: true,
  openedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  listing: { select: listingSelect },
  ...threadSelect,
} satisfies Prisma.ConversationSelect;
export type SupportConversationRecord = Prisma.ConversationGetPayload<{
  select: typeof supportConversationSelect;
}>;

/** What writing needs to know about a viewing's conversation: its state and who takes part. */
export const viewingParticipantsSelect = {
  id: true,
  status: true,
  tenantId: true,
  listing: { select: { landlordId: true, agencyId: true } },
  conversation: { select: { messageCount: true, requesterReadAt: true, responderReadAt: true } },
} satisfies Prisma.ViewingSelect;
export type ViewingParticipantsRecord = Prisma.ViewingGetPayload<{
  select: typeof viewingParticipantsSelect;
}>;

/** What writing needs to know about a support request. */
export const supportParticipantsSelect = {
  id: true,
  openedById: true,
  closedAt: true,
  messageCount: true,
  requesterReadAt: true,
  responderReadAt: true,
} satisfies Prisma.ConversationSelect;
export type SupportParticipantsRecord = Prisma.ConversationGetPayload<{
  select: typeof supportParticipantsSelect;
}>;

export const messageSelect = {
  id: true,
  conversationId: true,
  side: true,
  body: true,
  createdAt: true,
  sender: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.MessageSelect;
export type MessageRecord = Prisma.MessageGetPayload<{ select: typeof messageSelect }>;
