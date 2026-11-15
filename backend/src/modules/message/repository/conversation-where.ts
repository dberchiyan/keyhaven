import { Prisma } from '../../../generated/prisma/client';
import { MessageSide } from '../service/message-side';
import type { ConversationScope } from '../service/message.types';

/**
 * The scope as a SQL fragment over `viewings v` joined with `listings l` (the inbox and the
 * unread total are raw statements: Prisma cannot compare a message's time with the row's own
 * read marker). The ids are bound parameters; nothing here comes from a request string.
 */
export const conversationScopeSql = (scope: ConversationScope): Prisma.Sql => {
  switch (scope.kind) {
    case 'TENANT':
      return Prisma.sql`v.tenant_id = ${scope.tenantId}::uuid`;
    case 'LANDLORD':
      return Prisma.sql`l.landlord_id = ${scope.landlordId}::uuid`;
    case 'AGENCY':
      return Prisma.sql`l.agency_id = ${scope.agencyId}::uuid`;
    case 'ALL':
      return Prisma.sql`TRUE`;
  }
};

/** The thread column that says when this side last read it (`t` = viewing_threads). */
export const readAtSql = (side: MessageSide): Prisma.Sql =>
  side === MessageSide.TENANT ? Prisma.sql`t.tenant_read_at` : Prisma.sql`t.owner_read_at`;
