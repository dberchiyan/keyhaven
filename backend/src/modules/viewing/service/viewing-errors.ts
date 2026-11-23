import { BusinessRuleException, ViewingSlotTakenException } from '@/common/exception/api.exception';

import { MAX_ACTIVE_VIEWINGS } from './viewing-limits';

export const ViewingError = {
    noSchedule: (): BusinessRuleException => new BusinessRuleException('errors.viewing.noSchedule'),
    pastSlot: (): BusinessRuleException => new BusinessRuleException('errors.viewing.pastSlot', {}, 'startsAt'),
    slotUnavailable: (): BusinessRuleException =>
        new BusinessRuleException('errors.viewing.slotUnavailable', {}, 'startsAt'),
    alreadyActive: (): BusinessRuleException => new BusinessRuleException('errors.viewing.alreadyActive'),
    tooMany: (): BusinessRuleException =>
        new BusinessRuleException('errors.viewing.tooMany', { max: MAX_ACTIVE_VIEWINGS }),
    /** The partial unique index on (listing, slot) decided a race: another request holds the slot. */
    slotTaken: (): ViewingSlotTakenException => new ViewingSlotTakenException(),
    notPending: (): BusinessRuleException => new BusinessRuleException('errors.viewing.notPending'),
    notCancellable: (): BusinessRuleException => new BusinessRuleException('errors.viewing.notCancellable'),
    /** A decision on a slot that already started: the request names no field, the slot is not the caller's input. */
    slotStarted: (): BusinessRuleException => new BusinessRuleException('errors.viewing.pastSlot'),
} as const;
