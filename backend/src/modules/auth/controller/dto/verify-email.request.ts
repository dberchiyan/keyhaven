import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Tokens are 32 random bytes, base64url (43 characters); anything longer is not ours. */
export const TOKEN_MAX_LENGTH = 128;

export const TokenSchema = z
  .string({ error: 'validation.token.required' })
  .trim()
  .min(1, 'validation.token.required')
  .max(TOKEN_MAX_LENGTH, 'validation.token.invalid');

export const VerifyEmailRequestSchema = z.object({ token: TokenSchema });

export class VerifyEmailRequest extends createZodDto(VerifyEmailRequestSchema) {}
