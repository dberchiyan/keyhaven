import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import type { RequestContext } from '@/common/context/request-context';
import { type Cursor, toCursorPage } from '@/common/dto/cursor';

import { AuditEventRepository, type NewAuditEventRow } from '../repository/audit-event.repository';
import type { NewAuditEvent, SecurityEventPage, SecurityLogEntry } from './audit.types';
import { AUDIT_ACTIONS, type AuditAction } from './audit-action';
import { AUDIT_TEXT_MAX_LENGTH, AuditChangesSchema } from './audit-change';
import { ALL_SECURITY_ACTIONS, SECURITY_CATEGORY_ACTIONS, type SecurityCategory } from './security-category';

const isAction = (value: string): value is AuditAction => (AUDIT_ACTIONS as readonly string[]).includes(value);

@Injectable()
export class AuditService {
    constructor(
        private readonly auditEventRepository: AuditEventRepository,
        private readonly cls: ClsService<RequestContext>,
    ) {}

    /**
     * DATA-31: call inside the transaction that makes the change. Actor, IP, user agent and trace id come from the
     * request context.
     */
    async record(event: NewAuditEvent): Promise<void> {
        await this.auditEventRepository.create(this.toRow(event));
    }

    /** Several events of one change, written in one statement; same rules as `record`. */
    async recordMany(events: NewAuditEvent[]): Promise<void> {
        await this.auditEventRepository.createMany(events.map((event) => this.toRow(event)));
    }

    /**
     * A user's security log (sign-ins, password changes, ended sessions), newest first. Rows are guarded by
     * ck_audit_events_action, so an unknown action is skipped rather than shown.
     */
    async findSecurityPage(
        userId: string,
        category: SecurityCategory | undefined,
        after: Cursor | undefined,
        size: number,
    ): Promise<SecurityEventPage> {
        const page = toCursorPage(
            await this.auditEventRepository.findSecurityEvents(
                userId,
                category ? SECURITY_CATEGORY_ACTIONS[category] : ALL_SECURITY_ACTIONS,
                after,
                size,
            ),
            size,
        );
        const newDevices = await this.auditEventRepository.findNewDeviceSignIns(
            userId,
            page.content.map((record) => record.id),
        );
        return {
            content: page.content.flatMap((record) =>
                isAction(record.action)
                    ? [
                          {
                              id: record.id,
                              occurredAt: record.occurredAt,
                              action: record.action,
                              ipAddress: record.ipAddress,
                              userAgent: record.userAgent,
                              isNewDevice: newDevices.has(record.id),
                          },
                      ]
                    : [],
            ),
            nextCursor: page.nextCursor,
        };
    }

    /** DATA-23: the person's security log for their export, newest first, at most `take` rows; no device analysis. */
    async findSecurityExport(userId: string, take: number): Promise<SecurityLogEntry[]> {
        const records = await this.auditEventRepository.findLatestSecurityEvents(userId, ALL_SECURITY_ACTIONS, take);
        return records.flatMap((record) =>
            isAction(record.action)
                ? [
                      {
                          action: record.action,
                          occurredAt: record.occurredAt,
                          ipAddress: record.ipAddress,
                          userAgent: record.userAgent,
                      },
                  ]
                : [],
        );
    }

    private toRow(event: NewAuditEvent): NewAuditEventRow {
        return {
            action: event.action,
            actorUserId:
                event.actorUserId !== undefined ? event.actorUserId : (this.cls.get('principal')?.userId ?? null),
            targetType: event.target.type,
            targetId: event.target.id,
            targetLabel: event.target.label.slice(0, AUDIT_TEXT_MAX_LENGTH),
            changes: AuditChangesSchema.parse(event.changes),
            ipAddress: this.cls.get('clientIp') ?? null,
            userAgent: this.cls.get('userAgent') ?? null,
            traceId: this.cls.isActive() ? this.cls.getId() : null,
        };
    }
}
