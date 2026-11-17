import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NewPasswordSchema } from '../../../../common/dto/password';
import { TokenSchema } from './verify-email.request';

export const ResetPasswordRequestSchema = z.object({
    token: TokenSchema,
    newPassword: NewPasswordSchema,
});

export class ResetPasswordRequest extends createZodDto(ResetPasswordRequestSchema) {}
