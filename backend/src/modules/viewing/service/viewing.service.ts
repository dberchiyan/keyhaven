import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import {
    BusinessRuleException,
    ConcurrentModificationException,
    ResourceNotFoundException,
    ViewingSlotTakenException,
} from '@/common/exception/api.exception';
import { classifyPrismaError, PrismaErrorKind } from '@/common/persistence/prisma-error';
import type { Principal } from '@/common/security/principal';
import { MS_PER_MINUTE } from '@/common/time/units';
import { AuditService } from '@/modules/audit/service/audit.service';
import { AuditAction, AuditTargetType } from '@/modules/audit/service/audit-action';
import { AuditField, auditValue } from '@/modules/audit/service/audit-change';
import { ListingStatus } from '@/modules/listing/service/listing-status';

import type { BookableListingRecord } from '../repository/record/viewing.record';
import { ViewingRepository } from '../repository/viewing.repository';
import type { RequestViewingCommand, Viewing, ViewingAudience, ViewingDecision } from './viewing.types';
import { hideFromTenant, viewingAudienceOf } from './viewing-audience';
import { MAX_ACTIVE_VIEWINGS } from './viewing-limits';
import { ViewingNotifier } from './viewing-notifier.service';
import { ViewingQueryService } from './viewing-query.service';
import type { ViewingScheduleDocument } from './viewing-schedule';
import { isOfferedSlot, scheduleOf } from './viewing-slot';
import {
    CancelledBy,
    isViewingStatus,
    VIEWING_TRANSITIONS,
    ViewingStatus,
    type ViewingTransition,
} from './viewing-status';
import { ZonedClock } from './zoned-time';

const TRANSITION_ACTION = {
    confirm: AuditAction.VIEWING_CONFIRMED,
    decline: AuditAction.VIEWING_DECLINED,
    cancel: AuditAction.VIEWING_CANCELLED,
} as const satisfies Record<ViewingTransition, AuditAction>;

const cancelledByOf = (transition: ViewingTransition, audience: ViewingAudience): CancelledBy | null => {
    if (transition !== 'cancel') {
        return null;
    }
    return audience === 'TENANT' ? CancelledBy.TENANT : CancelledBy.OWNER;
};

/**
 * A transition the table does not allow from the current status is 422; so is any decision on a
 * slot that already started — it cannot be confirmed any more, nor called off after the fact.
 */
const assertDecidable = (status: ViewingStatus, startsAt: Date, transition: ViewingTransition, now: Date): void => {
    const notAllowedKey = transition === 'cancel' ? 'errors.viewing.notCancellable' : 'errors.viewing.notPending';
    if (!(VIEWING_TRANSITIONS[transition].from as readonly ViewingStatus[]).includes(status)) {
        throw new BusinessRuleException(notAllowedKey);
    }
    if (startsAt.getTime() <= now.getTime()) {
        throw new BusinessRuleException(
            transition === 'cancel' ? 'errors.viewing.notCancellable' : 'errors.viewing.pastSlot',
        );
    }
};

/**
 * Viewings (M2): a tenant's request in one of the offered slots, the owner's answer and either
 * side's cancellation. SEC-21: no double booking — the partial unique index on (listing, slot) of
 * live rows decides a race, not application code.
 */
@Injectable()
export class ViewingService {
    constructor(
        private readonly viewingRepository: ViewingRepository,
        private readonly auditService: AuditService,
        private readonly viewingQueryService: ViewingQueryService,
        private readonly notifier: ViewingNotifier,
        @InjectPinoLogger(ViewingService.name) private readonly logger: PinoLogger,
    ) {}

    /**
     * A tenant asks for one of the offered slots. Checks that do not need the row (the home is on
     * the site and has hours, the slot is one the hours offer, the tenant's limits) happen first;
     * the slot itself is claimed by the insert — a unique violation means someone was quicker.
     * DATA-14: the owner is told after the commit.
     */
    async request(principal: Principal, command: RequestViewingCommand): Promise<Viewing> {
        const listing = await this.viewingRepository.findBookable(command.listingId);
        if (!listing || listing.status !== ListingStatus.PUBLISHED) {
            throw new ResourceNotFoundException();
        }
        const schedule = scheduleOf(listing);
        if (!schedule) {
            throw new BusinessRuleException('errors.viewing.noSchedule');
        }
        await this.assertRequestable(principal.userId, listing, schedule, command);
        const id = await this.claimSlot(principal, listing, command, schedule.slotMinutes);
        const loaded = await this.viewingQueryService.load(id, 'OWNER');
        await this.notifier.requested(loaded.record, loaded);
        return hideFromTenant(loaded.viewing);
    }

    /** The owner's answer (confirm, decline) or either side's cancellation; the other side is told after commit. */
    async decide(principal: Principal, viewingId: string, decision: ViewingDecision): Promise<Viewing> {
        const audience = viewingAudienceOf(principal);
        const isChanged = await this.applyDecision(principal, viewingId, decision, audience);
        const loaded = await this.viewingQueryService.load(viewingId, 'OWNER');
        if (isChanged) {
            this.notifier.changed(loaded.record);
            await this.notifier.decided(loaded, decision.transition, audience);
        }
        return audience === 'TENANT' ? hideFromTenant(loaded.viewing) : loaded.viewing;
    }

    private async assertRequestable(
        tenantId: string,
        listing: BookableListingRecord,
        schedule: ViewingScheduleDocument,
        command: RequestViewingCommand,
    ): Promise<void> {
        const now = new Date();
        if (command.startsAt.getTime() <= now.getTime()) {
            throw new BusinessRuleException('errors.viewing.pastSlot', {}, 'startsAt');
        }
        if (!isOfferedSlot(new ZonedClock(listing.city.timeZone), schedule, command.startsAt, now)) {
            throw new BusinessRuleException('errors.viewing.slotUnavailable', {}, 'startsAt');
        }
        if (await this.viewingRepository.hasActiveByTenantAndListing(tenantId, command.listingId)) {
            throw new BusinessRuleException('errors.viewing.alreadyActive');
        }
        if ((await this.viewingRepository.countActiveByTenant(tenantId, now)) >= MAX_ACTIVE_VIEWINGS) {
            throw new BusinessRuleException('errors.viewing.tooMany', { max: MAX_ACTIVE_VIEWINGS });
        }
    }

    @Transactional()
    private async claimSlot(
        principal: Principal,
        listing: BookableListingRecord,
        command: RequestViewingCommand,
        slotMinutes: number,
    ): Promise<string> {
        const id = await this.insertRequest(principal.userId, listing.id, command, slotMinutes);
        await this.auditService.record({
            action: AuditAction.VIEWING_REQUESTED,
            target: { type: AuditTargetType.VIEWING, id, label: listing.title },
            changes: [{ field: AuditField.STATUS, from: null, to: auditValue.status(ViewingStatus.REQUESTED) }],
        });
        return id;
    }

    /**
     * Either partial unique index answers a race: the slot went to someone else, or this tenant's
     * own concurrent request landed first — the second is the rarer one and reads the same way.
     */
    private async insertRequest(
        tenantId: string,
        listingId: string,
        command: RequestViewingCommand,
        slotMinutes: number,
    ): Promise<string> {
        try {
            return await this.viewingRepository.create(
                {
                    listingId,
                    tenantId,
                    startsAt: command.startsAt,
                    endsAt: new Date(command.startsAt.getTime() + slotMinutes * MS_PER_MINUTE),
                    message: command.message,
                },
                tenantId,
            );
        } catch (error: unknown) {
            if (classifyPrismaError(error) === PrismaErrorKind.UNIQUE_VIOLATION) {
                throw new ViewingSlotTakenException();
            }
            throw error;
        }
    }

    /**
     * CORE-21: the transition table decides — repeating a decision answers the current state
     * (API-4), anything else is 422. Returns whether a row changed (then the other side is told).
     */
    @Transactional()
    private async applyDecision(
        principal: Principal,
        viewingId: string,
        decision: ViewingDecision,
        audience: ViewingAudience,
    ): Promise<boolean> {
        const current = await this.viewingRepository.findStatusById(viewingId);
        if (!current || !isViewingStatus(current.status)) {
            throw new ResourceNotFoundException();
        }
        const target = VIEWING_TRANSITIONS[decision.transition].to;
        if (current.status === target) {
            return false;
        }
        const now = new Date();
        assertDecidable(current.status, current.startsAt, decision.transition, now);
        const isUpdated = await this.viewingRepository.updateStatus(
            viewingId,
            current.version,
            {
                status: target,
                note: decision.note,
                cancelledBy: cancelledByOf(decision.transition, audience),
                decidedAt: now,
            },
            principal.userId,
        );
        if (!isUpdated) {
            throw new ConcurrentModificationException();
        }
        await this.recordTransition(viewingId, decision.transition, current.status, target);
        this.logger.info(
            { viewingId, transition: decision.transition, by: principal.userId },
            'Viewing status changed',
        );
        return true;
    }

    private async recordTransition(
        viewingId: string,
        transition: ViewingTransition,
        from: ViewingStatus,
        to: ViewingStatus,
    ): Promise<void> {
        const record = await this.viewingRepository.findById(viewingId);
        await this.auditService.record({
            action: TRANSITION_ACTION[transition],
            target: { type: AuditTargetType.VIEWING, id: viewingId, label: record?.listing.title ?? '' },
            changes: [{ field: AuditField.STATUS, from: auditValue.status(from), to: auditValue.status(to) }],
        });
    }
}
