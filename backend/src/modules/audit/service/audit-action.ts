export const AuditAction = {
    LISTING_CREATED: 'listing.created',
    LISTING_UPDATED: 'listing.updated',
    LISTING_PUBLISHED: 'listing.published',
    LISTING_UNPUBLISHED: 'listing.unpublished',
    LISTING_SUSPENDED: 'listing.suspended',
    VIEWING_REQUESTED: 'viewing.requested',
    VIEWING_CONFIRMED: 'viewing.confirmed',
    VIEWING_DECLINED: 'viewing.declined',
    VIEWING_CANCELLED: 'viewing.cancelled',
    VIEWING_EXPIRED: 'viewing.expired',
    USER_REGISTERED: 'user.registered',
    USER_UPDATED: 'user.updated',
    USER_ERASED: 'user.erased',
    AUTH_SIGNED_IN: 'auth.signed_in',
    AUTH_SIGN_IN_FAILED: 'auth.sign_in_failed',
    AUTH_SIGNED_OUT: 'auth.signed_out',
    AUTH_EMAIL_VERIFIED: 'auth.email_verified',
    AUTH_PASSWORD_CHANGED: 'auth.password_changed',
    AUTH_PASSWORD_RESET: 'auth.password_reset',
    AUTH_SESSION_ENDED: 'auth.session_ended',
    AUTH_OTHER_SESSIONS_ENDED: 'auth.other_sessions_ended',
    AUTH_SESSION_EVICTED: 'auth.session_evicted',
    AUTH_SIGN_IN_LOCKED: 'auth.sign_in_locked',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
export const AUDIT_ACTIONS = Object.values(AuditAction) as [AuditAction, ...AuditAction[]];

export const AuditTargetType = {
    USER: 'user',
    LISTING: 'listing',
    VIEWING: 'viewing',
} as const;
export type AuditTargetType = (typeof AuditTargetType)[keyof typeof AuditTargetType];
export const AUDIT_TARGET_TYPES = Object.values(AuditTargetType) as [AuditTargetType, ...AuditTargetType[]];
