import { Prisma } from '../../../generated/prisma/client';
import { MessageSide } from '../service/message-side';
import type { SupportScope, ViewingScope } from '../service/message.types';

/**
 * The scopes as SQL fragments (the inbox and the unread total are raw statements: Prisma cannot
 * compare a message's time with the row's own read marker). The ids are bound parameters;
 * nothing here comes from a request string.
 */
export const viewingScopeSql = (scope: ViewingScope): Prisma.Sql => {
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

/** Over `conversations c` of kind SUPPORT. */
export const supportScopeSql = (scope: SupportScope): Prisma.Sql =>
    scope.kind === 'OWN' ? Prisma.sql`c.opened_by = ${scope.userId}::uuid` : Prisma.sql`TRUE`;

/** The conversation column that says when this side last read it (`c` = conversations). */
export const readAtSql = (side: MessageSide): Prisma.Sql =>
    side === MessageSide.REQUESTER ? Prisma.sql`c.requester_read_at` : Prisma.sql`c.responder_read_at`;
