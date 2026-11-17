import { AuditAction } from './audit-action';

export const SECURITY_CATEGORIES = ['SIGN_INS', 'FAILED', 'PASSWORD', 'SESSIONS'] as const;
export type SecurityCategory = (typeof SECURITY_CATEGORIES)[number];

export const SECURITY_CATEGORY_ACTIONS: Record<SecurityCategory, readonly AuditAction[]> = {
    SIGN_INS: [AuditAction.AUTH_SIGNED_IN, AuditAction.AUTH_SIGNED_OUT, AuditAction.AUTH_EMAIL_VERIFIED],
    FAILED: [AuditAction.AUTH_SIGN_IN_FAILED, AuditAction.AUTH_SIGN_IN_LOCKED],
    PASSWORD: [AuditAction.AUTH_PASSWORD_CHANGED, AuditAction.AUTH_PASSWORD_RESET],
    SESSIONS: [AuditAction.AUTH_SESSION_ENDED, AuditAction.AUTH_OTHER_SESSIONS_ENDED, AuditAction.AUTH_SESSION_EVICTED],
};

export const ALL_SECURITY_ACTIONS: readonly AuditAction[] = Object.values(SECURITY_CATEGORY_ACTIONS).flat();
