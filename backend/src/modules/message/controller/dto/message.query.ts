import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { cursorQueryShape } from '@/common/dto/cursor';

export const ConversationListQuerySchema = z.object(cursorQueryShape);
export class ConversationListQuery extends createZodDto(ConversationListQuerySchema) {}
