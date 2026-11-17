import type { Prisma } from '@/generated/prisma/client';

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
    photos: {
        where: readyPhotos,
        select: { url: true, storageKey: true },
        orderBy: { position: 'asc' },
        take: 1,
    },
    landlord: { select: { firstName: true, lastName: true, email: true } },
    agency: { select: { name: true, email: true } },
} satisfies Prisma.ListingSelect;

const threadSelect = {
    lastMessageAt: true,
    messageCount: true,
    requesterReadAt: true,
    responderReadAt: true,
    messages: {
        select: { body: true, isRemoved: true, side: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1,
    },
} satisfies Prisma.ConversationSelect;

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
    isRemoved: true,
    createdAt: true,
    sender: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.MessageSelect;
export type MessageRecord = Prisma.MessageGetPayload<{ select: typeof messageSelect }>;

export const writtenMessageExportSelect = {
    conversationId: true,
    body: true,
    createdAt: true,
} satisfies Prisma.MessageSelect;
export type WrittenMessageExportRecord = Prisma.MessageGetPayload<{ select: typeof writtenMessageExportSelect }>;

export const openedConversationExportSelect = {
    subject: true,
    createdAt: true,
} satisfies Prisma.ConversationSelect;
export type OpenedConversationExportRecord = Prisma.ConversationGetPayload<{
    select: typeof openedConversationExportSelect;
}>;
