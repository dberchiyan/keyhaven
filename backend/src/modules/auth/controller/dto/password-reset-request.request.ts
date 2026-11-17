import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { EMAIL_MAX_LENGTH } from './login.request';

export const PasswordResetRequestRequestSchema = z.object({
    email: z
        .email({
            error: (issue) => (issue.input === undefined ? 'validation.email.required' : 'validation.email.invalid'),
        })
        .max(EMAIL_MAX_LENGTH, 'validation.email.tooLong'),
});

export class PasswordResetRequestRequest extends createZodDto(PasswordResetRequestRequestSchema) {}

/** Echoes the address the link was sent to — the same answer whether it has an account or not. */
export const PasswordResetRequestResponseSchema = z.object({ email: z.string().max(254) });

export class PasswordResetRequestResponse extends createZodDto(PasswordResetRequestResponseSchema) {}
