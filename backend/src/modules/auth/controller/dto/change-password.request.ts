import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { CurrentPasswordSchema, NewPasswordSchema } from '@/common/dto/password';

export const ChangePasswordRequestSchema = z.object({
    currentPassword: CurrentPasswordSchema,
    newPassword: NewPasswordSchema,
});

export class ChangePasswordRequest extends createZodDto(ChangePasswordRequestSchema) {}
