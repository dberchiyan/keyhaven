import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import {
  ConcurrentModificationException,
  ResourceNotFoundException,
} from '../../../common/exception/api.exception';
import type { Principal } from '../../../common/security/principal';
import { AuditTargetType } from '../../audit/service/audit-action';
import { AuditAction } from '../../audit/service/audit-action';
import { AuditService } from '../../audit/service/audit.service';
import type { ViewingScheduleRecord } from '../repository/record/viewing.record';
import { ViewingScheduleRepository } from '../repository/viewing-schedule.repository';
import { ViewingRepository } from '../repository/viewing.repository';
import { ViewingScheduleSchema } from './viewing-schedule';
import type { SaveScheduleCommand, ViewingSchedule } from './viewing.types';

/** A listing's viewing hours: read on the owner's page, replaced as one document. */
@Injectable()
export class ViewingScheduleService {
  constructor(
    private readonly scheduleRepository: ViewingScheduleRepository,
    private readonly viewingRepository: ViewingRepository,
    private readonly auditService: AuditService,
  ) {}

  /** The hours and the zone they are in; `schedule` is null while the owner set none. */
  async find(listingId: string): Promise<{ schedule: ViewingSchedule | null; timeZone: string }> {
    const record = await this.scheduleRepository.findByListing(listingId);
    if (record) {
      return { schedule: toSchedule(record), timeZone: record.listing.city.timeZone };
    }
    const listing = await this.viewingRepository.findBookable(listingId);
    if (!listing) {
      throw new ResourceNotFoundException();
    }
    return { schedule: null, timeZone: listing.city.timeZone };
  }

  async save(
    principal: Principal,
    listingId: string,
    command: SaveScheduleCommand,
  ): Promise<ViewingSchedule> {
    await this.replace(principal, listingId, command);
    const record = await this.scheduleRepository.findByListing(listingId);
    const schedule = record ? toSchedule(record) : null;
    if (!schedule) {
      throw new ResourceNotFoundException();
    }
    return schedule;
  }

  /**
   * Replace the whole document (api.md → a replaceable set is a PUT). Existing viewings stay as
   * they are: a confirmed visit is a promise, hours changing later do not undo it.
   */
  @Transactional()
  private async replace(
    principal: Principal,
    listingId: string,
    command: SaveScheduleCommand,
  ): Promise<void> {
    const { version, ...document } = command;
    const columns = {
      slotMinutes: document.slotMinutes,
      noticeHours: document.noticeHours,
      horizonDays: document.horizonDays,
      windows: document.windows,
      blockedDays: [...document.blockedDays].sort(),
    };
    const existing = await this.scheduleRepository.findByListing(listingId);
    if (existing) {
      if (version !== existing.version) {
        throw new ConcurrentModificationException();
      }
      if (
        !(await this.scheduleRepository.update(
          listingId,
          existing.version,
          columns,
          principal.userId,
        ))
      ) {
        throw new ConcurrentModificationException();
      }
    } else {
      const listing = await this.viewingRepository.findBookable(listingId);
      if (!listing) {
        throw new ResourceNotFoundException();
      }
      await this.scheduleRepository.create(listingId, columns, principal.userId);
    }
    const listing = await this.viewingRepository.findBookable(listingId);
    await this.auditService.record({
      action: AuditAction.LISTING_UPDATED,
      target: { type: AuditTargetType.LISTING, id: listingId, label: listing?.title ?? '' },
      changes: [],
    });
  }

  @Transactional()
  async remove(listingId: string): Promise<void> {
    const listing = await this.viewingRepository.findBookable(listingId);
    if (!listing) {
      throw new ResourceNotFoundException();
    }
    await this.scheduleRepository.remove(listingId);
    await this.auditService.record({
      action: AuditAction.LISTING_UPDATED,
      target: { type: AuditTargetType.LISTING, id: listingId, label: listing.title },
      changes: [],
    });
  }
}

/** A stored document that no longer parses shows as closed hours rather than failing the page. */
export const toSchedule = (record: ViewingScheduleRecord): ViewingSchedule | null => {
  const parsed = ViewingScheduleSchema.safeParse({
    slotMinutes: record.slotMinutes,
    noticeHours: record.noticeHours,
    horizonDays: record.horizonDays,
    windows: record.windows,
    blockedDays: record.blockedDays,
  });
  if (!parsed.success) {
    return null;
  }
  return {
    ...parsed.data,
    listingId: record.listingId,
    timeZone: record.listing.city.timeZone,
    updatedAt: record.updatedAt,
    version: record.version,
  };
};
