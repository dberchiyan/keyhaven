import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { VIEWING_STATUSES } from '../../../viewing/service/viewing-status';
import {
  MAX_CONVERSATIONS,
  MAX_MESSAGE_LENGTH,
  MAX_THREAD_MESSAGES,
} from '../../service/message-limits';
import { COUNTERPART_KINDS, MESSAGE_SIDES } from '../../service/message-side';

export const MessageSideSchema = z.enum(MESSAGE_SIDES).meta({ id: 'MessageSide' });

const ConversationListingSchema = z
  .object({
    id: z.uuid(),
    title: z.string().max(120),
    coverPhotoUrl: z.string().max(500).nullable(),
    neighborhood: z.string().max(100).nullable(),
    city: z.object({
      name: z.string().max(100),
      state: z.string().length(2),
      timeZone: z.string().max(64),
    }),
    /** The exact address: the owner's side always, the tenant's while the viewing is confirmed. */
    address: z
      .object({ line1: z.string().max(255), line2: z.string().max(255).nullable() })
      .nullable(),
  })
  .meta({ id: 'ConversationListing' });

export const MessageSchema = z
  .object({
    id: z.uuid(),
    viewingId: z.uuid(),
    side: MessageSideSchema,
    sender: z.object({
      id: z.uuid(),
      firstName: z.string().max(100),
      lastName: z.string().max(100),
    }),
    body: z.string().max(MAX_MESSAGE_LENGTH),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Message' });

/** One viewing's conversation as the caller's side sees it. */
export const ConversationSchema = z
  .object({
    viewingId: z.uuid(),
    status: z.enum(VIEWING_STATUSES),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    /** Both sides can write (the viewing is confirmed, ahead or held); otherwise read only. */
    open: z.boolean(),
    /** The caller's side: the client tells its own messages apart by it. */
    side: MessageSideSchema,
    listing: ConversationListingSchema,
    counterpart: z
      .object({ name: z.string().max(200), kind: z.enum(COUNTERPART_KINDS) })
      .meta({ id: 'Counterpart' }),
    lastMessage: z
      .object({
        body: z.string().max(MAX_MESSAGE_LENGTH),
        side: MessageSideSchema,
        createdAt: z.iso.datetime(),
      })
      .nullable(),
    messageCount: z.number().int().min(0),
    unread: z.number().int().min(0),
    readAt: z.iso.datetime().nullable(),
    /** When the other side last read the thread (the caller's earlier messages were seen). */
    seenAt: z.iso.datetime().nullable(),
  })
  .meta({ id: 'Conversation' });

export const ConversationDetailSchema = ConversationSchema.extend({
  messages: z.array(MessageSchema).max(MAX_THREAD_MESSAGES),
}).meta({ id: 'ConversationDetail' });

export type MessageBody = z.infer<typeof MessageSchema>;
export type ConversationBody = z.infer<typeof ConversationSchema>;
export type ConversationDetailBody = z.infer<typeof ConversationDetailSchema>;

export class MessageResponse extends createZodDto(z.object(MessageSchema.shape)) {}
export class ConversationDetailResponse extends createZodDto(
  z.object(ConversationDetailSchema.shape),
) {}
export class ConversationListResponse extends createZodDto(
  z.object({ content: z.array(ConversationSchema).max(MAX_CONVERSATIONS) }),
) {}
/** Unread messages over the caller's whole inbox (the badge). */
export class ConversationSummaryResponse extends createZodDto(
  z.object({ unread: z.number().int().min(0) }),
) {}
/** When the caller's side last read the thread; null while it has no messages. */
export class ReadReceiptResponse extends createZodDto(
  z.object({ readAt: z.iso.datetime().nullable() }),
) {}
