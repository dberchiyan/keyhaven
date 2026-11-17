import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import type { Pageable } from '../../../common/dto/pageable';
import type { RequestContext } from '../../../common/context/request-context';
import { AuditEventRepository, type NewAuditEventRow } from '../repository/audit-event.repository';
import { AUDIT_ACTIONS, type AuditAction } from './audit-action';
import { AuditChangesSchema } from './audit-change';
import type { NewAuditEvent, SecurityEventPage } from './audit.types';
import type { AuditEventSortField } from './audit-sort';
import { ALL_SECURITY_ACTIONS, SECURITY_CATEGORY_ACTIONS, type SecurityCategory } from './security-category';

const isAction = (value: string): value is AuditAction => (AUDIT_ACTIONS as readonly string[]).includes(value);

@Injectable()
export class AuditService {
    constructor(
        private readonly auditEventRepository: AuditEventRepository,
        private readonly cls: ClsService<RequestContext>,
    ) {}

    /**
     * Call inside the transaction that makes the change (data.md → Audit log). Actor, IP, user
     * agent and trace id come from the request context.
     */
    async record(event: NewAuditEvent): Promise<void> {
        await this.auditEventRepository.create(this.toRow(event));
    }

    /** Several events of one change, written in one statement; same rules as `record`. */
    async recordMany(events: NewAuditEvent[]): Promise<void> {
        await this.auditEventRepository.createMany(events.map((event) => this.toRow(event)));
    }

    private toRow(event: NewAuditEvent): NewAuditEventRow {
        return {
            action: event.action,
            actorUserId:
                event.actorUserId !== undefined ? event.actorUserId : (this.cls.get('principal')?.userId ?? null),
            targetType: event.target.type,
            targetId: event.target.id,
            targetLabel: event.target.label.slice(0, 255),
            changes: AuditChangesSchema.parse(event.changes),
            ipAddress: this.cls.get('clientIp') ?? null,
            userAgent: this.cls.get('userAgent') ?? null,
            traceId: this.cls.isActive() ? this.cls.getId() : null,
        };
    }

    /** A user's security log (sign-ins, password changes, ended sessions), newest first. */
    async findSecurityPage(
        userId: string,
        category: SecurityCategory | null,
        pageable: Pageable<AuditEventSortField>,
    ): Promise<SecurityEventPage> {
        const page = await this.auditEventRepository.findSecurityPage(
            userId,
            category ? SECURITY_CATEGORY_ACTIONS[category] : ALL_SECURITY_ACTIONS,
            pageable,
        );
        const newDevices = await this.auditEventRepository.findNewDeviceSignIns(
            userId,
            page.content.map((record) => record.id),
        );
        return {
            content: page.content.flatMap((record) =>
                // Rows are guarded by ck_audit_events_action; an unknown action is skipped, not shown.
                isAction(record.action)
                    ? [
                          {
                              id: record.id,
                              occurredAt: record.occurredAt,
                              action: record.action,
                              ipAddress: record.ipAddress,
                              userAgent: record.userAgent,
                              newDevice: newDevices.has(record.id),
                          },
                      ]
                    : [],
            ),
            totalElements: page.totalElements,
        };
    }
}
