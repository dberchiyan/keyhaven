import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { MAX_MESSAGE_LENGTH, MAX_SUBJECT_LENGTH } from '@/modules/message/service/message-limits';

const bodySchema = z
    .string({ error: 'validation.message.body.required' })
    .trim()
    .min(1, 'validation.message.body.required')
    .max(MAX_MESSAGE_LENGTH, 'validation.message.body.tooLong');

export const SendMessageRequestSchema = z.object({ body: bodySchema });
export class SendMessageRequest extends createZodDto(SendMessageRequestSchema) {}

export const StartConversationRequestSchema = z.object({
    subject: z
        .string({ error: 'validation.message.subject.required' })
        .trim()
        .min(1, 'validation.message.subject.required')
        .max(MAX_SUBJECT_LENGTH, 'validation.message.subject.tooLong'),
    body: bodySchema,
    listingId: z.uuid({ error: 'validation.message.listingId.invalid' }).nullable().optional(),
});
export class StartConversationRequest extends createZodDto(StartConversationRequestSchema) {}
