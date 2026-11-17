import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import {
    ADDRESS_LINE_MAX_LENGTH,
    CITY_NAME_MAX_LENGTH,
    LISTING_TITLE_MAX_LENGTH,
    NEIGHBORHOOD_MAX_LENGTH,
    PERSON_NAME_MAX_LENGTH,
    PHOTO_URL_MAX_LENGTH,
    TIME_ZONE_MAX_LENGTH,
} from '@/common/dto/limits';
import {
    MAX_CONVERSATIONS,
    MAX_MESSAGE_LENGTH,
    MAX_SUBJECT_LENGTH,
    MAX_THREAD_MESSAGES,
} from '@/modules/message/service/message-limits';
import { CONVERSATION_KINDS, COUNTERPART_KINDS, MESSAGE_SIDES } from '@/modules/message/service/message-side';
import { VIEWING_STATUSES } from '@/modules/viewing/service/viewing-status';

const STATE_CODE_LENGTH = 2;
const COUNTERPART_NAME_MAX_LENGTH = 200;

export const MessageSideSchema = z.enum(MESSAGE_SIDES).meta({ id: 'MessageSide' });

const ConversationListingSchema = z
    .object({
        id: z.uuid(),
        title: z.string().max(LISTING_TITLE_MAX_LENGTH),
        coverPhotoUrl: z.string().max(PHOTO_URL_MAX_LENGTH).nullable(),
        neighborhood: z.string().max(NEIGHBORHOOD_MAX_LENGTH).nullable(),
        city: z.object({
            name: z.string().max(CITY_NAME_MAX_LENGTH),
            state: z.string().length(STATE_CODE_LENGTH),
            timeZone: z.string().max(TIME_ZONE_MAX_LENGTH),
        }),
        address: z
            .object({
                line1: z.string().max(ADDRESS_LINE_MAX_LENGTH),
                line2: z.string().max(ADDRESS_LINE_MAX_LENGTH).nullable(),
            })
            .nullable(),
    })
    .meta({ id: 'ConversationListing' });

export const MessageSchema = z
    .object({
        id: z.uuid(),
        conversationId: z.uuid(),
        side: MessageSideSchema,
        sender: z.object({
            id: z.uuid(),
            firstName: z.string().max(PERSON_NAME_MAX_LENGTH),
            lastName: z.string().max(PERSON_NAME_MAX_LENGTH),
        }),
        body: z.string().max(MAX_MESSAGE_LENGTH),
        isRemoved: z.boolean(),
        createdAt: z.iso.datetime(),
    })
    .meta({ id: 'Message' });

export const ConversationSchema = z
    .object({
        id: z.uuid(),
        kind: z.enum(CONVERSATION_KINDS).meta({ id: 'ConversationKind' }),
        isOpen: z.boolean(),
        side: MessageSideSchema,
        viewing: z
            .object({
                id: z.uuid(),
                status: z.enum(VIEWING_STATUSES),
                startsAt: z.iso.datetime(),
                endsAt: z.iso.datetime(),
            })
            .nullable(),
        support: z
            .object({
                subject: z.string().max(MAX_SUBJECT_LENGTH),
                openedAt: z.iso.datetime(),
                closedAt: z.iso.datetime().nullable(),
            })
            .nullable(),
        listing: ConversationListingSchema.nullable(),
        counterpart: z
            .object({ name: z.string().max(COUNTERPART_NAME_MAX_LENGTH), kind: z.enum(COUNTERPART_KINDS) })
            .meta({ id: 'Counterpart' }),
        lastMessage: z
            .object({
                body: z.string().max(MAX_MESSAGE_LENGTH),
                isRemoved: z.boolean(),
                side: MessageSideSchema,
                createdAt: z.iso.datetime(),
            })
            .nullable(),
        messageCount: z.number().int().min(0),
        unread: z.number().int().min(0),
        readAt: z.iso.datetime().nullable(),
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
export class ConversationDetailResponse extends createZodDto(z.object(ConversationDetailSchema.shape)) {}
export class ConversationListResponse extends createZodDto(
    z.object({ content: z.array(ConversationSchema).max(MAX_CONVERSATIONS) }),
) {}
export class ConversationSummaryResponse extends createZodDto(z.object({ unread: z.number().int().min(0) })) {}
export class ReadReceiptResponse extends createZodDto(z.object({ readAt: z.iso.datetime().nullable() })) {}
