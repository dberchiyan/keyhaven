import { z } from 'zod';

import { MESSAGE_MAX, SUBJECT_MAX } from './api/message-api';

/** Mirrors backend StartConversationRequestSchema (message/controller/dto/message.request.ts). */
export const MESSAGE_LIMITS = { subject: SUBJECT_MAX, body: MESSAGE_MAX } as const;

export const startConversationSchema = z.object({
    subject: z
        .string()
        .trim()
        .min(1, 'validation:message.subject.required')
        .max(MESSAGE_LIMITS.subject, 'validation:message.subject.tooLong'),
    body: z
        .string()
        .trim()
        .min(1, 'validation:message.body.required')
        .max(MESSAGE_LIMITS.body, 'validation:message.body.tooLong'),
});

export type StartConversationValues = z.input<typeof startConversationSchema>;
export type StartConversationOutput = z.output<typeof startConversationSchema>;
