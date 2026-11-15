import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../../../common/config/app-config.service';
import type { Pageable } from '../../../common/dto/pageable';
import {
  BusinessRuleException,
  ConcurrentModificationException,
  ResourceNotFoundException,
  ViewingSlotTakenException,
} from '../../../common/exception/api.exception';
import { classifyPrismaError, PrismaErrorKind } from '../../../common/persistence/prisma-error';
import type { Principal } from '../../../common/security/principal';
import { AuditAction, AuditTargetType } from '../../audit/service/audit-action';
import { AuditField, auditValue } from '../../audit/service/audit-change';
import { AuditService } from '../../audit/service/audit.service';
import type { EmailMessage } from '../../email/service/email-sender';
import { EmailSender } from '../../email/service/email-sender';
import { EventService } from '../../event/service/event.service';
import { LiveEventType } from '../../event/service/live-event';
import { isListingKind, ListingKind } from '../../listing/service/listing-kind';
import { ListingStatus } from '../../listing/service/listing-status';
import { ObjectStorage } from '../../storage/service/object-storage';
import { UserRole } from '../../user/service/user-role';
import type { BookableListingRecord, ViewingRecord } from '../repository/record/viewing.record';
import { ViewingRepository } from '../repository/viewing.repository';
import { MAX_ACTIVE_VIEWINGS } from './viewing-limits';
import {
  viewingCancelledEmail,
  viewingConfirmedEmail,
  viewingDeclinedEmail,
  viewingReminderEmail,
  viewingRequestedEmail,
} from './viewing-email';
import { ViewingScheduleSchema, type ViewingScheduleDocument } from './viewing-schedule';
import type { ViewingSortField } from './viewing-sort';
import {
  CancelledBy,
  isViewingStatus,
  VIEWING_TRANSITIONS,
  ViewingStatus,
  type ViewingTransition,
} from './viewing-status';
import type {
  RequestViewingCommand,
  Viewing,
  ViewingAudience,
  ViewingCriteria,
  ViewingPage,
  ViewingScope,
  ViewingSlot,
  ViewingSlots,
  ViewingSummary,
} from './viewing.types';
import { addDays, weekdayOf, zonedDay, zonedInstant, zonedMinute } from './zoned-time';

/** The reminder goes out once the viewing is within a day. */
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const TRANSITION_ACTION = {
  confirm: AuditAction.VIEWING_CONFIRMED,
  decline: AuditAction.VIEWING_DECLINED,
  cancel: AuditAction.VIEWING_CANCELLED,
} as const satisfies Record<ViewingTransition, AuditAction>;

interface Decision {
  transition: ViewingTransition;
  note: string | null;
}

interface Recipient {
  email: string;
  firstName: string;
}

interface Mapped {
  viewing: Viewing;
  owner: Recipient | null;
}

/**
 * Viewings (M2): the open slots of a home from its owner's hours, a tenant's request in one of
 * them, the owner's answer, cancellations, reminders. No double booking: the partial unique
 * index on (listing, slot) of live rows decides a race, not application code.
 */
@Injectable()
export class ViewingService {
  constructor(
    private readonly viewingRepository: ViewingRepository,
    private readonly auditService: AuditService,
    private readonly emailSender: EmailSender,
    private readonly events: EventService,
    private readonly storage: ObjectStorage,
    private readonly config: AppConfigService,
    @InjectPinoLogger(ViewingService.name) private readonly logger: PinoLogger,
  ) {}

  /**
   * The slots a tenant can take from `from` (the city's local day, default today) for up to
   * `days` days, within the owner's notice and horizon, without the days off and the slots held.
   */
  async slots(listingId: string, from: string | undefined, days: number): Promise<ViewingSlots> {
    const listing = await this.viewingRepository.findBookable(listingId);
    if (!listing) {
      throw new ResourceNotFoundException();
    }
    const timeZone = listing.city.timeZone;
    const now = new Date();
    const today = zonedDay(timeZone, now);
    const schedule = scheduleOf(listing);
    if (!schedule) {
      return {
        open: false,
        timeZone,
        slotMinutes: null,
        noticeHours: 0,
        horizonEnd: today,
        from: today,
        days: [],
      };
    }
    const horizonEnd = addDays(today, schedule.horizonDays);
    const start = from !== undefined && from > today ? from : today;
    const earliest = new Date(now.getTime() + schedule.noticeHours * HOUR_MS);
    const dayList: { day: string; slots: ViewingSlot[] }[] = [];
    for (let day = start, count = 0; count < days && day <= horizonEnd; day = addDays(day, 1)) {
      count += 1;
      dayList.push({ day, slots: slotsOfDay(schedule, timeZone, day, earliest) });
    }
    const all = dayList.flatMap((entry) => entry.slots);
    const first = all[0];
    const last = all[all.length - 1];
    if (first && last) {
      const taken = new Set(
        (
          await this.viewingRepository.findActiveStartsBetween(
            listingId,
            first.startsAt,
            last.startsAt,
          )
        ).map((instant) => instant.getTime()),
      );
      for (const entry of dayList) {
        entry.slots = entry.slots.filter((slot) => !taken.has(slot.startsAt.getTime()));
      }
    }
    return {
      open: true,
      timeZone,
      slotMinutes: schedule.slotMinutes,
      noticeHours: schedule.noticeHours,
      horizonEnd,
      from: start,
      days: dayList,
    };
  }

  /**
   * A tenant asks for one of the offered slots. Checks that do not need the row (the home is on
   * the site and has hours, the slot is one the hours offer, the tenant's limits) happen first;
   * the slot itself is claimed by the insert — a unique violation means someone was quicker.
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
    const now = new Date();
    if (command.startsAt.getTime() <= now.getTime()) {
      throw new BusinessRuleException('errors.viewing.pastSlot', {}, 'startsAt');
    }
    if (!isOfferedSlot(schedule, listing.city.timeZone, command.startsAt, now)) {
      throw new BusinessRuleException('errors.viewing.slotUnavailable', {}, 'startsAt');
    }
    if (
      await this.viewingRepository.hasActiveByTenantAndListing(principal.userId, command.listingId)
    ) {
      throw new BusinessRuleException('errors.viewing.alreadyActive');
    }
    if (
      (await this.viewingRepository.countActiveByTenant(principal.userId, now)) >=
      MAX_ACTIVE_VIEWINGS
    ) {
      throw new BusinessRuleException('errors.viewing.tooMany', { max: MAX_ACTIVE_VIEWINGS });
    }
    const id = await this.claimSlot(principal, listing, command, schedule.slotMinutes);
    const { viewing, owner } = await this.load(id, 'OWNER');
    // After commit (data.md → Transactions): the owner's open tabs and inbox learn of the request.
    this.events.publishToOwner(listing.landlordId, listing.agencyId, {
      type: LiveEventType.VIEWING_CHANGED,
      viewingId: id,
    });
    await this.deliver(owner && viewingRequestedEmail(owner, viewing, this.appUrl()), id);
    return hideFromTenant(viewing);
  }

  @Transactional()
  private async claimSlot(
    principal: Principal,
    listing: BookableListingRecord,
    command: RequestViewingCommand,
    slotMinutes: number,
  ): Promise<string> {
    let id: string;
    try {
      id = await this.viewingRepository.create(
        {
          listingId: listing.id,
          tenantId: principal.userId,
          startsAt: command.startsAt,
          endsAt: new Date(command.startsAt.getTime() + slotMinutes * 60_000),
          message: command.message,
        },
        principal.userId,
      );
    } catch (error: unknown) {
      if (classifyPrismaError(error) === PrismaErrorKind.UNIQUE_VIOLATION) {
        // Either partial unique index: the slot went to someone else, or this tenant's own
        // concurrent request landed first — the second is the rarer one and reads the same way.
        throw new ViewingSlotTakenException();
      }
      throw error;
    }
    await this.auditService.record({
      action: AuditAction.VIEWING_REQUESTED,
      target: { type: AuditTargetType.VIEWING, id, label: listing.title },
      changes: [
        {
          field: AuditField.STATUS,
          from: null,
          to: auditValue.status(ViewingStatus.REQUESTED),
        },
      ],
    });
    return id;
  }

  /** The owner's answer (confirm, decline) or either side's cancellation. */
  async decide(principal: Principal, viewingId: string, decision: Decision): Promise<Viewing> {
    const audience = audienceOf(principal);
    const changed = await this.applyDecision(principal, viewingId, decision, audience);
    const { viewing, owner, record } = await this.load(viewingId, 'OWNER');
    if (changed) {
      this.publishChanged(record);
      await this.notifyDecision(viewing, owner, decision.transition, audience);
    }
    return audience === 'TENANT' ? hideFromTenant(viewing) : viewing;
  }

  /**
   * The transition table decides (architecture.md): repeating a decision answers the current
   * state, anything else is 422. Returns whether a row changed (then the other side is told).
   */
  @Transactional()
  private async applyDecision(
    principal: Principal,
    viewingId: string,
    decision: Decision,
    audience: ViewingAudience,
  ): Promise<boolean> {
    const current = await this.viewingRepository.findStatusById(viewingId);
    if (!current || !isViewingStatus(current.status)) {
      throw new ResourceNotFoundException();
    }
    const rule = VIEWING_TRANSITIONS[decision.transition];
    if (current.status === rule.to) {
      return false;
    }
    if (!(rule.from as readonly ViewingStatus[]).includes(current.status)) {
      throw new BusinessRuleException(
        decision.transition === 'cancel'
          ? 'errors.viewing.notCancellable'
          : 'errors.viewing.notPending',
      );
    }
    const now = new Date();
    if (current.startsAt.getTime() <= now.getTime()) {
      // A slot that started cannot be confirmed any more, nor called off after the fact.
      throw new BusinessRuleException(
        decision.transition === 'cancel'
          ? 'errors.viewing.notCancellable'
          : 'errors.viewing.pastSlot',
      );
    }
    const changed = await this.viewingRepository.updateStatus(
      viewingId,
      current.version,
      {
        status: rule.to,
        note: decision.note,
        cancelledBy:
          decision.transition === 'cancel'
            ? audience === 'TENANT'
              ? CancelledBy.TENANT
              : CancelledBy.OWNER
            : null,
        decidedAt: now,
      },
      principal.userId,
    );
    if (!changed) {
      throw new ConcurrentModificationException();
    }
    const record = await this.viewingRepository.findById(viewingId);
    await this.auditService.record({
      action: TRANSITION_ACTION[decision.transition],
      target: { type: AuditTargetType.VIEWING, id: viewingId, label: record?.listing.title ?? '' },
      changes: [
        {
          field: AuditField.STATUS,
          from: auditValue.status(current.status),
          to: auditValue.status(rule.to),
        },
      ],
    });
    this.logger.info(
      { viewingId, transition: decision.transition, by: principal.userId },
      'Viewing status changed',
    );
    return true;
  }

  private async notifyDecision(
    viewing: Viewing,
    owner: Recipient | null,
    transition: ViewingTransition,
    audience: ViewingAudience,
  ): Promise<void> {
    const appUrl = this.appUrl();
    const tenant = viewing.tenant
      ? { email: viewing.tenant.email, firstName: viewing.tenant.firstName }
      : null;
    switch (transition) {
      case 'confirm':
        await this.deliver(tenant && viewingConfirmedEmail(tenant, viewing, appUrl), viewing.id);
        return;
      case 'decline':
        await this.deliver(tenant && viewingDeclinedEmail(tenant, viewing, appUrl), viewing.id);
        return;
      case 'cancel':
        await this.deliver(
          audience === 'TENANT'
            ? owner && viewingCancelledEmail(owner, 'OWNER', viewing, appUrl)
            : tenant && viewingCancelledEmail(tenant, 'TENANT', viewing, appUrl),
          viewing.id,
        );
    }
  }

  /** A tenant's own viewings, latest slot first (the client splits ahead and past). */
  async listOwn(userId: string): Promise<Viewing[]> {
    return (await this.viewingRepository.findByTenant(userId)).map(
      (record) => this.toMapped(record, 'TENANT').viewing,
    );
  }

  async findOne(principal: Principal, viewingId: string): Promise<Viewing> {
    return (await this.load(viewingId, audienceOf(principal))).viewing;
  }

  /** The dashboard's page over the caller's scope. */
  async managedPage(
    principal: Principal,
    criteria: ViewingCriteria,
    pageable: Pageable<ViewingSortField>,
  ): Promise<ViewingPage> {
    const page = await this.viewingRepository.findPage(
      scopeOf(principal),
      criteria,
      pageable,
      new Date(),
    );
    return {
      content: page.content.map((record) => this.toMapped(record, 'OWNER').viewing),
      totalElements: page.totalElements,
    };
  }

  summary(principal: Principal): Promise<ViewingSummary> {
    return this.viewingRepository.countSummary(scopeOf(principal), new Date());
  }

  /** One home's live viewings ahead, for its management page (the policy checked ownership). */
  async listForListing(listingId: string): Promise<Viewing[]> {
    return (await this.viewingRepository.findUpcomingByListing(listingId, new Date())).map(
      (record) => this.toMapped(record, 'OWNER').viewing,
    );
  }

  /** Requests nobody answered before the slot: expired, every hour. Idempotent by construction. */
  @Cron('5 * * * *', { timeZone: 'UTC' })
  async expireUnanswered(): Promise<void> {
    const expired = await this.expireUnansweredNow(new Date());
    if (expired > 0) {
      this.logger.info({ expired }, 'Unanswered viewing requests expired');
    }
  }

  @Transactional()
  async expireUnansweredNow(now: Date): Promise<number> {
    const rows = await this.viewingRepository.findUnansweredBefore(now);
    let expired = 0;
    for (const row of rows) {
      const changed = await this.viewingRepository.updateStatus(
        row.id,
        row.version,
        { status: ViewingStatus.EXPIRED, note: null, cancelledBy: null, decidedAt: now },
        null,
      );
      if (!changed) {
        continue;
      }
      expired += 1;
      const record = await this.viewingRepository.findById(row.id);
      if (record) {
        this.publishChanged(record);
      }
      await this.auditService.record({
        action: AuditAction.VIEWING_EXPIRED,
        actorUserId: null,
        target: { type: AuditTargetType.VIEWING, id: row.id, label: '' },
        changes: [
          {
            field: AuditField.STATUS,
            from: auditValue.status(ViewingStatus.REQUESTED),
            to: auditValue.status(ViewingStatus.EXPIRED),
          },
        ],
      });
    }
    return expired;
  }

  /** The day-before reminder to both sides; marked before sending, so a crash never sends twice. */
  @Cron('10 * * * *', { timeZone: 'UTC' })
  async remindTomorrow(): Promise<void> {
    const sent = await this.sendReminders(new Date());
    if (sent > 0) {
      this.logger.info({ sent }, 'Viewing reminders sent');
    }
  }

  async sendReminders(now: Date): Promise<number> {
    const due = await this.viewingRepository.findReminderDue(
      now,
      new Date(now.getTime() + REMINDER_WINDOW_MS),
    );
    let sent = 0;
    for (const record of due) {
      if (!(await this.viewingRepository.markReminded(record.id, now))) {
        continue;
      }
      const { viewing, owner } = this.toMapped(record, 'OWNER');
      const appUrl = this.appUrl();
      const tenant = viewing.tenant
        ? { email: viewing.tenant.email, firstName: viewing.tenant.firstName }
        : null;
      await this.deliver(
        tenant && viewingReminderEmail(tenant, 'TENANT', viewing, appUrl),
        record.id,
      );
      await this.deliver(owner && viewingReminderEmail(owner, 'OWNER', viewing, appUrl), record.id);
      sent += 1;
    }
    return sent;
  }

  private async load(
    viewingId: string,
    audience: ViewingAudience,
  ): Promise<Mapped & { record: ViewingRecord }> {
    const record = await this.viewingRepository.findById(viewingId);
    if (!record) {
      throw new ResourceNotFoundException();
    }
    return { ...this.toMapped(record, audience), record };
  }

  /** Both sides' open tabs: the tenant's, and the owner's (landlord / agency). */
  private publishChanged(record: ViewingRecord): void {
    const event = { type: LiveEventType.VIEWING_CHANGED, viewingId: record.id } as const;
    this.events.publishToUser(record.tenantId, event);
    this.events.publishToOwner(record.listing.landlordId, record.listing.agencyId, event);
  }

  /** A failed delivery is logged, never thrown: the viewing is already what the client sees. */
  private async deliver(message: EmailMessage | null, viewingId: string): Promise<void> {
    if (!message) {
      return;
    }
    try {
      await this.emailSender.send(message);
    } catch (error: unknown) {
      this.logger.warn({ err: error, viewingId }, 'Viewing email not delivered');
    }
  }

  /** The viewing as the audience sees it, plus the owner's inbox (for emails, never in a DTO). */
  private toMapped(record: ViewingRecord, audience: ViewingAudience): Mapped {
    const cover = record.listing.photos[0];
    const status = isViewingStatus(record.status) ? record.status : ViewingStatus.EXPIRED;
    const viewing: Viewing = {
      id: record.id,
      status,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      message: record.message,
      note: record.note,
      cancelledBy:
        record.cancelledBy === CancelledBy.TENANT || record.cancelledBy === CancelledBy.OWNER
          ? record.cancelledBy
          : null,
      decidedAt: record.decidedAt,
      createdAt: record.createdAt,
      version: record.version,
      listing: {
        id: record.listing.id,
        title: record.listing.title,
        kind: isListingKind(record.listing.kind) ? record.listing.kind : ListingKind.RENT,
        coverPhotoUrl: cover
          ? (cover.url ?? (cover.storageKey ? this.storage.publicUrl(cover.storageKey) : null))
          : null,
        neighborhood: record.listing.neighborhood,
        city: record.listing.city,
        address:
          audience === 'OWNER' || status === ViewingStatus.CONFIRMED
            ? { line1: record.listing.addressLine1, line2: record.listing.addressLine2 }
            : null,
        demo: this.config.isDemo && record.listing.isDemo,
      },
      tenant: audience === 'OWNER' ? record.tenant : null,
    };
    const owner: Recipient | null = record.listing.landlord
      ? { email: record.listing.landlord.email, firstName: record.listing.landlord.firstName }
      : record.listing.agency
        ? { email: record.listing.agency.email, firstName: record.listing.agency.name }
        : null;
    return { viewing, owner };
  }

  private appUrl(): string {
    return this.config.get('APP_URL');
  }
}

const scopeOf = (principal: Principal): ViewingScope => {
  if (principal.hasAuthority(UserRole.ADMIN)) {
    return { kind: 'ALL' };
  }
  if (principal.hasAuthority(UserRole.AGENT) && principal.agencyId) {
    return { kind: 'AGENCY', agencyId: principal.agencyId };
  }
  return { kind: 'LANDLORD', landlordId: principal.userId };
};

const audienceOf = (principal: Principal): ViewingAudience =>
  principal.hasAuthority(UserRole.TENANT) ? 'TENANT' : 'OWNER';

/** The tenant's own view of a viewing: no tenant block, the address only once confirmed. */
const hideFromTenant = (viewing: Viewing): Viewing => ({
  ...viewing,
  tenant: null,
  listing: {
    ...viewing.listing,
    address: viewing.status === ViewingStatus.CONFIRMED ? viewing.listing.address : null,
  },
});

const scheduleOf = (listing: BookableListingRecord): ViewingScheduleDocument | null => {
  if (!listing.viewingSchedule) {
    return null;
  }
  const parsed = ViewingScheduleSchema.safeParse(listing.viewingSchedule);
  return parsed.success ? parsed.data : null;
};

/** The slots of one local day: each window stepped by the slot length, from the earliest allowed. */
const slotsOfDay = (
  schedule: ViewingScheduleDocument,
  timeZone: string,
  day: string,
  earliest: Date,
): ViewingSlot[] => {
  if (schedule.blockedDays.includes(day)) {
    return [];
  }
  const weekday = weekdayOf(day);
  const slots: ViewingSlot[] = [];
  for (const window of schedule.windows) {
    if (window.weekday !== weekday) {
      continue;
    }
    for (
      let minute = window.start;
      minute + schedule.slotMinutes <= window.end;
      minute += schedule.slotMinutes
    ) {
      const startsAt = zonedInstant(timeZone, day, minute);
      if (startsAt.getTime() < earliest.getTime()) {
        continue;
      }
      slots.push({
        startsAt,
        endsAt: new Date(startsAt.getTime() + schedule.slotMinutes * 60_000),
      });
    }
  }
  return slots.sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
};

/** Is this instant one of the slots the hours offer right now (notice, horizon, windows, days off)? */
const isOfferedSlot = (
  schedule: ViewingScheduleDocument,
  timeZone: string,
  startsAt: Date,
  now: Date,
): boolean => {
  if (startsAt.getTime() < now.getTime() + schedule.noticeHours * HOUR_MS) {
    return false;
  }
  const day = zonedDay(timeZone, startsAt);
  const today = zonedDay(timeZone, now);
  if (day > addDays(today, schedule.horizonDays) || schedule.blockedDays.includes(day)) {
    return false;
  }
  if (startsAt.getTime() % 60_000 !== 0) {
    return false;
  }
  const minute = zonedMinute(timeZone, startsAt);
  const weekday = weekdayOf(day);
  // Whole minutes only (the slot grid): a window's step from its start.
  return schedule.windows.some(
    (window) =>
      window.weekday === weekday &&
      minute >= window.start &&
      minute + schedule.slotMinutes <= window.end &&
      (minute - window.start) % schedule.slotMinutes === 0 &&
      zonedInstant(timeZone, day, minute).getTime() === startsAt.getTime(),
  );
};
