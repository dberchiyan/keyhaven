import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { ConcurrentModificationException, ResourceNotFoundException } from '@/common/exception/api.exception';
import { classifyPrismaError, PrismaErrorKind } from '@/common/persistence/prisma-error';
import type { Actor } from '@/common/security/actor';
import { Clock } from '@/common/time/clock';
import { MS_PER_MINUTE } from '@/common/time/units';
import { AuditService } from '@/modules/audit/service/audit.service';
import { AuditAction, AuditTargetType } from '@/modules/audit/service/audit-action';
import { AuditField, auditValue } from '@/modules/audit/service/audit-change';
import { ListingStatus } from '@/modules/listing/service/listing-status';

import type { BookableListingRecord } from '../repository/record/viewing.record';
import { ViewingRepository } from '../repository/viewing.repository';
import type { RequestViewingCommand, Viewing, ViewingAudience, ViewingDecision } from './viewing.types';
import { hideFromTenant, viewingAudienceOf } from './viewing-audience';
import { ViewingError } from './viewing-errors';
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
    if (!(VIEWING_TRANSITIONS[transition].from as readonly ViewingStatus[]).includes(status)) {
        throw transition === 'cancel' ? ViewingError.notCancellable() : ViewingError.notPending();
    }
    if (startsAt.getTime() <= now.getTime()) {
        throw transition === 'cancel' ? ViewingError.notCancellable() : ViewingError.slotStarted();
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
        private readonly clock: Clock,
        @InjectPinoLogger(ViewingService.name) private readonly logger: PinoLogger,
    ) {}

    /**
     * A tenant asks for one of the offered slots. Checks that do not need the row (the home is on
     * the site and has hours, the slot is one the hours offer, the tenant's limits) happen first;
     * the slot itself is claimed by the insert — a unique violation means someone was quicker.
     * DATA-14: the owner is told after the commit.
     */
    async request(command: RequestViewingCommand, actor: Actor): Promise<Viewing> {
        const listing = await this.viewingRepository.findBookable(command.listingId);
        if (!listing || listing.status !== ListingStatus.PUBLISHED) {
            throw new ResourceNotFoundException();
        }
        const schedule = scheduleOf(listing);
        if (!schedule) {
            throw ViewingError.noSchedule();
        }
        await this.assertRequestable(actor.userId, listing, schedule, command);
        const id = await this.claimSlot(listing, command, schedule.slotMinutes, actor);
        const loaded = await this.viewingQueryService.load(id, 'OWNER');
        await this.notifier.requested(loaded.record, loaded);
        return hideFromTenant(loaded.viewing);
    }

    /** The owner's answer (confirm, decline) or either side's cancellation; the other side is told after commit. */
    async decide(viewingId: string, decision: ViewingDecision, actor: Actor): Promise<Viewing> {
        const audience = viewingAudienceOf(actor);
        const isChanged = await this.applyDecision(viewingId, decision, audience, actor);
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
        const now = this.clock.now();
        if (command.startsAt.getTime() <= now.getTime()) {
            throw ViewingError.pastSlot();
        }
        if (!isOfferedSlot(new ZonedClock(listing.city.timeZone), schedule, command.startsAt, now)) {
            throw ViewingError.slotUnavailable();
        }
        if (await this.viewingRepository.hasActiveByTenantAndListing(tenantId, command.listingId)) {
            throw ViewingError.alreadyActive();
        }
        if ((await this.viewingRepository.countActiveByTenant(tenantId, now)) >= MAX_ACTIVE_VIEWINGS) {
            throw ViewingError.tooMany();
        }
    }

    @Transactional()
    private async claimSlot(
        listing: BookableListingRecord,
        command: RequestViewingCommand,
        slotMinutes: number,
        actor: Actor,
    ): Promise<string> {
        const id = await this.insertRequest(listing.id, command, slotMinutes, actor.userId);
        await this.auditService.record({
            action: AuditAction.VIEWING_REQUESTED,
            target: { type: AuditTargetType.VIEWING, id, label: listing.title },
            subjectId: listing.id,
            changes: [{ field: AuditField.STATUS, from: null, to: auditValue.status(ViewingStatus.REQUESTED) }],
        });
        return id;
    }

    /**
     * Either partial unique index answers a race: the slot went to someone else, or this tenant's
     * own concurrent request landed first — the second is the rarer one and reads the same way.
     */
    private async insertRequest(
        listingId: string,
        command: RequestViewingCommand,
        slotMinutes: number,
        tenantId: string,
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
                throw ViewingError.slotTaken();
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
        viewingId: string,
        decision: ViewingDecision,
        audience: ViewingAudience,
        actor: Actor,
    ): Promise<boolean> {
        const current = await this.viewingRepository.findStatusById(viewingId);
        if (!current || !isViewingStatus(current.status)) {
            throw new ResourceNotFoundException();
        }
        const target = VIEWING_TRANSITIONS[decision.transition].to;
        if (current.status === target) {
            return false;
        }
        const now = this.clock.now();
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
            actor.userId,
        );
        if (!isUpdated) {
            throw new ConcurrentModificationException();
        }
        await this.recordTransition(viewingId, decision.transition, current.status, target);
        this.logger.info({ viewingId, transition: decision.transition, by: actor.userId }, 'Viewing status changed');
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
            subjectId: record?.listingId ?? null,
            changes: [{ field: AuditField.STATUS, from: auditValue.status(from), to: auditValue.status(to) }],
        });
    }
}
