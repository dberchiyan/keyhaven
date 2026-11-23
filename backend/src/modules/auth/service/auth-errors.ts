import { BusinessConflictException, BusinessRuleException } from '@/common/exception/api.exception';

export const AuthError = {
    /** Tells that the address has an account: accepted, registration is rate-limited per IP. */
    emailTaken: (): BusinessConflictException =>
        new BusinessConflictException('errors.registration.emailTaken', {}, 'email'),
    alreadyVerified: (): BusinessRuleException => new BusinessRuleException('errors.verification.alreadyVerified'),
    invalidLink: (): BusinessRuleException => new BusinessRuleException('errors.verification.invalidLink'),
    currentPasswordWrong: (): BusinessRuleException =>
        new BusinessRuleException('errors.auth.currentPasswordWrong', {}, 'currentPassword'),
    /** The password asked again before an irreversible action: the same message, on the form's `password` field. */
    passwordWrong: (): BusinessRuleException =>
        new BusinessRuleException('errors.auth.currentPasswordWrong', {}, 'password'),
    samePassword: (): BusinessRuleException => new BusinessRuleException('errors.auth.samePassword', {}, 'newPassword'),
} as const;
