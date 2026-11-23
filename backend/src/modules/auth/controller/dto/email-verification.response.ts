import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { EMAIL_MAX_LENGTH } from '@/common/dto/limits';

export const EmailVerificationResponseSchema = z.object({
    email: z.string().max(EMAIL_MAX_LENGTH),
    verifiedAt: z.iso.datetime(),
});

export class EmailVerificationResponse extends createZodDto(EmailVerificationResponseSchema) {}
