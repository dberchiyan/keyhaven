import type { Prisma } from '../../../../generated/prisma/client';

/** A security-log entry: what, when, from where. */
export const securityEventSelect = {
    id: true,
    occurredAt: true,
    action: true,
    ipAddress: true,
    userAgent: true,
} satisfies Prisma.AuditEventSelect;
export type SecurityEventRecord = Prisma.AuditEventGetPayload<{
    select: typeof securityEventSelect;
}>;
