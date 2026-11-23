import type { Cursor } from '@/common/dto/cursor';

import type { AuditAction, AuditTargetType } from './audit-action';
import type { AuditChange } from './audit-change';

export interface NewAuditEvent {
    action: AuditAction;
    actorUserId?: string | null;
    target: { type: AuditTargetType; id: string; label: string };
    subjectId: string | null;
    changes: AuditChange[];
}

export interface SecurityEvent {
    id: string;
    occurredAt: Date;
    action: AuditAction;
    ipAddress: string | null;
    userAgent: string | null;
    isNewDevice: boolean;
}

export type SecurityLogEntry = Pick<SecurityEvent, 'action' | 'occurredAt' | 'ipAddress' | 'userAgent'>;

export interface SecurityEventPage {
    content: SecurityEvent[];
    nextCursor: Cursor | undefined;
}
