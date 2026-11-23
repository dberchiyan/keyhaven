import { BusinessRuleException } from '@/common/exception/api.exception';

import { MAX_OPEN_SUPPORT, MAX_THREAD_MESSAGES } from './message-limits';

export const MessageError = {
    threadFull: (): BusinessRuleException =>
        new BusinessRuleException('errors.message.threadFull', { max: MAX_THREAD_MESSAGES }),
    notSupport: (): BusinessRuleException => new BusinessRuleException('errors.message.notSupport'),
    staffReadOnly: (): BusinessRuleException => new BusinessRuleException('errors.message.staffReadOnly'),
    viewingClosed: (): BusinessRuleException => new BusinessRuleException('errors.message.closed'),
    notConfirmed: (): BusinessRuleException => new BusinessRuleException('errors.message.notConfirmed'),
    supportClosed: (): BusinessRuleException => new BusinessRuleException('errors.message.supportClosed'),
    tooManyOpen: (): BusinessRuleException =>
        new BusinessRuleException('errors.message.tooManyOpen', { max: MAX_OPEN_SUPPORT }),
} as const;
