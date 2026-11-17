import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { EMAIL_MAX_LENGTH } from '@/common/dto/limits';

export const PasswordResetRequestRequestSchema = z.object({
    email: z
        .email({
            error: (issue) => (issue.input === undefined ? 'validation.email.required' : 'validation.email.invalid'),
        })
        .max(EMAIL_MAX_LENGTH, 'validation.email.tooLong'),
});

export class PasswordResetRequestRequest extends createZodDto(PasswordResetRequestRequestSchema) {}

export const PasswordResetRequestResponseSchema = z.object({ email: z.string().max(EMAIL_MAX_LENGTH) });

export class PasswordResetRequestResponse extends createZodDto(PasswordResetRequestResponseSchema) {}
