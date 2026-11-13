import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const EmailVerificationResponseSchema = z.object({
  email: z.string().max(254),
  verifiedAt: z.iso.datetime(),
});

export class EmailVerificationResponse extends createZodDto(EmailVerificationResponseSchema) {}
