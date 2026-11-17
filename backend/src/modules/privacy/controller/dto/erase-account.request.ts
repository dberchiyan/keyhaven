import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { CurrentPasswordSchema } from '@/common/dto/password';

export const EraseAccountRequestSchema = z.object({ password: CurrentPasswordSchema });

export class EraseAccountRequest extends createZodDto(EraseAccountRequestSchema) {}
