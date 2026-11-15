import type { Prisma } from '../../../../generated/prisma/client';

/** Only finished uploads are shown (the listing module's rule). */
const readyPhotos = { status: 'READY' } as const;

/**
 * A viewing with what a conversation shows about it: the home (cover, place, the address, the
 * owner's inbox), the tenant, and the thread's markers with its latest message.
 */
export const conversationSelect = {
  id: true,
  status: true,
  startsAt: true,
  endsAt: true,
  tenantId: true,
  listing: {
    select: {
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
    },
  },
  tenant: { select: { id: true, firstName: true, lastName: true, email: true } },
  thread: {
    select: {
      lastMessageAt: true,
      messageCount: true,
      tenantReadAt: true,
      ownerReadAt: true,
      // Bounded: the latest message is the inbox row's preview.
      messages: {
        select: { body: true, side: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1,
      },
    },
  },
} satisfies Prisma.ViewingSelect;
export type ConversationRecord = Prisma.ViewingGetPayload<{ select: typeof conversationSelect }>;

/** What writing needs to know about the viewing: its state and who takes part. */
export const participantsSelect = {
  id: true,
  status: true,
  tenantId: true,
  listing: { select: { landlordId: true, agencyId: true } },
  thread: { select: { messageCount: true, tenantReadAt: true, ownerReadAt: true } },
} satisfies Prisma.ViewingSelect;
export type ParticipantsRecord = Prisma.ViewingGetPayload<{ select: typeof participantsSelect }>;

export const messageSelect = {
  id: true,
  viewingId: true,
  side: true,
  body: true,
  createdAt: true,
  sender: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ViewingMessageSelect;
export type MessageRecord = Prisma.ViewingMessageGetPayload<{ select: typeof messageSelect }>;
