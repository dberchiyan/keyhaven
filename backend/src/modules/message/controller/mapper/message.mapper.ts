import type {
    Conversation,
    ConversationDetail,
    ConversationListing,
    Message,
} from '@/modules/message/service/message.types';

import type { ConversationBody, ConversationDetailBody, MessageBody } from '../dto/message.response';

export const toMessageResponse = (message: Message): MessageBody => ({
    id: message.id,
    conversationId: message.conversationId,
    side: message.side,
    sender: {
        id: message.sender.id,
        firstName: message.sender.firstName,
        lastName: message.sender.lastName,
    },
    body: message.body,
    isRemoved: message.isRemoved,
    createdAt: message.createdAt.toISOString(),
});

const toConversationListingResponse = (listing: ConversationListing): ConversationBody['listing'] => ({
    id: listing.id,
    title: listing.title,
    coverPhotoUrl: listing.coverPhotoUrl,
    neighborhood: listing.neighborhood,
    city: { name: listing.city.name, state: listing.city.state, timeZone: listing.city.timeZone },
    address: listing.address,
});

export const toConversationResponse = (conversation: Conversation): ConversationBody => ({
    id: conversation.id,
    kind: conversation.kind,
    isOpen: conversation.isOpen,
    side: conversation.side,
    viewing: conversation.viewing
        ? {
              id: conversation.viewing.id,
              status: conversation.viewing.status,
              startsAt: conversation.viewing.startsAt.toISOString(),
              endsAt: conversation.viewing.endsAt.toISOString(),
          }
        : null,
    support: conversation.support
        ? {
              subject: conversation.support.subject,
              openedAt: conversation.support.openedAt.toISOString(),
              closedAt: conversation.support.closedAt?.toISOString() ?? null,
          }
        : null,
    listing: conversation.listing ? toConversationListingResponse(conversation.listing) : null,
    counterpart: { name: conversation.counterpart.name, kind: conversation.counterpart.kind },
    lastMessage: conversation.lastMessage
        ? {
              body: conversation.lastMessage.body,
              isRemoved: conversation.lastMessage.isRemoved,
              side: conversation.lastMessage.side,
              createdAt: conversation.lastMessage.createdAt.toISOString(),
          }
        : null,
    messageCount: conversation.messageCount,
    unread: conversation.unread,
    readAt: conversation.readAt?.toISOString() ?? null,
    seenAt: conversation.seenAt?.toISOString() ?? null,
});

export const toConversationDetailResponse = (conversation: ConversationDetail): ConversationDetailBody => ({
    ...toConversationResponse(conversation),
    messages: conversation.messages.map(toMessageResponse),
});
