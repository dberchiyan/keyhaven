import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ConcurrentModificationException, ResourceNotFoundException } from '@/common/exception/api.exception';
import { AuditService } from '@/modules/audit/service/audit.service';
import { AuditAction, AuditTargetType } from '@/modules/audit/service/audit-action';

import type { ViewingScheduleRecord } from '../repository/record/viewing.record';
import { ViewingRepository } from '../repository/viewing.repository';
import { ViewingScheduleRepository } from '../repository/viewing-schedule.repository';
import type { SaveScheduleCommand, ViewingSchedule } from './viewing.types';
import { ViewingScheduleSchema } from './viewing-schedule';

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

    async save(listingId: string, command: SaveScheduleCommand, actorUserId: string): Promise<ViewingSchedule> {
        await this.replace(listingId, command, actorUserId);
        const record = await this.scheduleRepository.findByListing(listingId);
        const schedule = record ? toSchedule(record) : null;
        if (!schedule) {
            throw new ResourceNotFoundException();
        }
        return schedule;
    }

    /**
     * Replace the whole document (a PUT, DATA-16 on the version the owner edited). Existing viewings
     * stay as they are: a confirmed visit is a promise, hours changing later do not undo it.
     */
    @Transactional()
    private async replace(listingId: string, command: SaveScheduleCommand, actorUserId: string): Promise<void> {
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
            if (!(await this.scheduleRepository.update(listingId, existing.version, columns, actorUserId))) {
                throw new ConcurrentModificationException();
            }
        } else {
            const listing = await this.viewingRepository.findBookable(listingId);
            if (!listing) {
                throw new ResourceNotFoundException();
            }
            await this.scheduleRepository.create(listingId, columns, actorUserId);
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

/** DATA-22: parsed on read as on write; a stored document that no longer parses shows as closed hours rather than failing the page. */
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
