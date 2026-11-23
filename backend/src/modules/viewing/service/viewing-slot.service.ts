import { Injectable } from '@nestjs/common';

import { ResourceNotFoundException } from '@/common/exception/api.exception';
import { Clock } from '@/common/time/clock';

import { ViewingRepository } from '../repository/viewing.repository';
import type { ViewingSlotDay, ViewingSlots } from './viewing.types';
import { offeredDays, scheduleOf } from './viewing-slot';
import { addDays, ZonedClock } from './zoned-time';

/** Slots are computed from the owner's hours, never stored; the live viewings take theirs out. */
@Injectable()
export class ViewingSlotService {
    constructor(
        private readonly viewingRepository: ViewingRepository,
        private readonly clock: Clock,
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
        const zoned = new ZonedClock(timeZone);
        const now = this.clock.now();
        const today = zoned.day(now);
        const schedule = scheduleOf(listing);
        if (!schedule) {
            return {
                isOpen: false,
                timeZone,
                slotMinutes: null,
                noticeHours: 0,
                horizonEndsOn: today,
                from: today,
                days: [],
            };
        }
        const horizonEndsOn = addDays(today, schedule.horizonDays);
        const start = from !== undefined && from > today ? from : today;
        const dayList = offeredDays(zoned, schedule, { start, horizonEndsOn, maxDays: days }, now);
        return {
            isOpen: true,
            timeZone,
            slotMinutes: schedule.slotMinutes,
            noticeHours: schedule.noticeHours,
            horizonEndsOn,
            from: start,
            days: await this.withoutTaken(listingId, dayList),
        };
    }

    /** One query over the listed window, not one per slot (DATA-3). */
    private async withoutTaken(listingId: string, dayList: ViewingSlotDay[]): Promise<ViewingSlotDay[]> {
        const all = dayList.flatMap((entry) => entry.slots);
        const first = all[0];
        const last = all[all.length - 1];
        if (!first || !last) {
            return dayList;
        }
        const starts = await this.viewingRepository.findActiveStartsBetween(listingId, first.startsAt, last.startsAt);
        const taken = new Set(starts.map((instant) => instant.getTime()));
        return dayList.map((entry) => ({
            day: entry.day,
            slots: entry.slots.filter((slot) => !taken.has(slot.startsAt.getTime())),
        }));
    }
}
