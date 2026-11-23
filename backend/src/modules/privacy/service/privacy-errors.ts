import { BusinessRuleException } from '@/common/exception/api.exception';

export const PrivacyError = {
    adminCannotErase: (): BusinessRuleException => new BusinessRuleException('errors.personalData.adminCannotErase'),
} as const;
