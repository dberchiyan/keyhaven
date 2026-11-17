import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { JobLock } from '@/common/persistence/job-lock';
import { JobName } from '@/common/persistence/job-name';
import { MS_PER_DAY } from '@/common/time/units';
import { AuditService } from '@/modules/audit/service/audit.service';
import type { NewAuditEvent } from '@/modules/audit/service/audit.types';
import { AuditAction, AuditTargetType } from '@/modules/audit/service/audit-action';
import { AuditField, auditValue } from '@/modules/audit/service/audit-change';

import { ViewingRepository } from '../repository/viewing.repository';
import { ViewingNotifier } from './viewing-notifier.service';
import { ViewingQueryService } from './viewing-query.service';
import { ViewingStatus } from './viewing-status';

const REMINDER_WINDOW_MS = MS_PER_DAY;

/** The hourly housekeeping of viewings (DATA-41): unanswered requests expire, the day-before reminders go out. */
@Injectable()
export class ViewingJobService {
    constructor(
        private readonly viewingRepository: ViewingRepository,
        private readonly auditService: AuditService,
        private readonly viewingQueryService: ViewingQueryService,
        private readonly notifier: ViewingNotifier,
        private readonly jobLock: JobLock,
        @InjectPinoLogger(ViewingJobService.name) private readonly logger: PinoLogger,
    ) {}

    /** Requests nobody answered before the slot: expired, every hour. Idempotent by construction (DATA-40). */
    @Cron('5 * * * *', { timeZone: 'UTC' })
    async expireUnanswered(): Promise<void> {
        await this.jobLock.runExclusive(JobName.EXPIRE_UNANSWERED_VIEWINGS, async () => {
            const expired = await this.expireUnansweredNow(new Date());
            this.logger.info({ expired }, 'Unanswered viewing requests expired');
        });
    }

    /** DATA-3: one UPDATE for the batch, one read for the notices, one insert for the audit rows. */
    @Transactional()
    async expireUnansweredNow(now: Date): Promise<number> {
        const due = await this.viewingRepository.findUnansweredBefore(now);
        if (due.length === 0) {
            return 0;
        }
        const expiredIds = await this.viewingRepository.expireRequested(
            due.map((row) => row.id),
            now,
        );
        if (expiredIds.length === 0) {
            return 0;
        }
        const records = await this.viewingRepository.findByIds(expiredIds);
        await this.auditService.recordMany(expiredIds.map((id) => this.expiredEvent(id)));
        for (const record of records) {
            this.notifier.changed(record);
        }
        return expiredIds.length;
    }

    /** The day-before reminder to both sides (DATA-40): marked before sending, so a crash never sends twice. */
    @Cron('10 * * * *', { timeZone: 'UTC' })
    async remindTomorrow(): Promise<void> {
        await this.jobLock.runExclusive(JobName.REMIND_UPCOMING_VIEWINGS, async () => {
            const sent = await this.sendReminders(new Date());
            this.logger.info({ sent }, 'Viewing reminders sent');
        });
    }

    /** Marked in one statement before sending, so a crash or a second instance never sends twice (DATA-40). */
    async sendReminders(now: Date): Promise<number> {
        const due = await this.viewingRepository.findReminderDue(now, new Date(now.getTime() + REMINDER_WINDOW_MS));
        if (due.length === 0) {
            return 0;
        }
        const marked = new Set(
            await this.viewingRepository.markReminded(
                due.map((record) => record.id),
                now,
            ),
        );
        const toRemind = due.filter((record) => marked.has(record.id));
        for (const record of toRemind) {
            await this.notifier.remind(this.viewingQueryService.toView(record, 'OWNER'));
        }
        return toRemind.length;
    }

    private expiredEvent(viewingId: string): NewAuditEvent {
        return {
            action: AuditAction.VIEWING_EXPIRED,
            actorUserId: null,
            target: { type: AuditTargetType.VIEWING, id: viewingId, label: '' },
            changes: [
                {
                    field: AuditField.STATUS,
                    from: auditValue.status(ViewingStatus.REQUESTED),
                    to: auditValue.status(ViewingStatus.EXPIRED),
                },
            ],
        };
    }
}
