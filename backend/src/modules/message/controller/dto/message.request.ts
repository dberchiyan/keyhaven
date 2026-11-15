import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from '../../service/message-limits';

/** One message: text only, never empty. */
export const SendMessageRequestSchema = z.object({
  body: z
    .string({ error: 'validation.message.body.required' })
    .trim()
    .min(1, 'validation.message.body.required')
    .max(MAX_MESSAGE_LENGTH, 'validation.message.body.tooLong'),
});
export class SendMessageRequest extends createZodDto(SendMessageRequestSchema) {}
