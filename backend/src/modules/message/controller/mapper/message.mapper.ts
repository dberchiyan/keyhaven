import type { Conversation, ConversationDetail, Message } from '../../service/message.types';
import type {
  ConversationBody,
  ConversationDetailBody,
  MessageBody,
} from '../dto/message.response';

export const toMessageResponse = (message: Message): MessageBody => ({
  id: message.id,
  viewingId: message.viewingId,
  side: message.side,
  sender: {
    id: message.sender.id,
    firstName: message.sender.firstName,
    lastName: message.sender.lastName,
  },
  body: message.body,
  createdAt: message.createdAt.toISOString(),
});

export const toConversationResponse = (conversation: Conversation): ConversationBody => ({
  viewingId: conversation.viewingId,
  status: conversation.status,
  startsAt: conversation.startsAt.toISOString(),
  endsAt: conversation.endsAt.toISOString(),
  open: conversation.open,
  side: conversation.side,
  listing: {
    id: conversation.listing.id,
    title: conversation.listing.title,
    coverPhotoUrl: conversation.listing.coverPhotoUrl,
    neighborhood: conversation.listing.neighborhood,
    city: {
      name: conversation.listing.city.name,
      state: conversation.listing.city.state,
      timeZone: conversation.listing.city.timeZone,
    },
    address: conversation.listing.address,
  },
  counterpart: { name: conversation.counterpart.name, kind: conversation.counterpart.kind },
  lastMessage: conversation.lastMessage
    ? {
        body: conversation.lastMessage.body,
        side: conversation.lastMessage.side,
        createdAt: conversation.lastMessage.createdAt.toISOString(),
      }
    : null,
  messageCount: conversation.messageCount,
  unread: conversation.unread,
  readAt: conversation.readAt?.toISOString() ?? null,
  seenAt: conversation.seenAt?.toISOString() ?? null,
});

export const toConversationDetailResponse = (
  conversation: ConversationDetail,
): ConversationDetailBody => ({
  ...toConversationResponse(conversation),
  messages: conversation.messages.map(toMessageResponse),
});
