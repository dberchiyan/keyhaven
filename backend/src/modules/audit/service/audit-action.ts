/** `<resource>.<past_tense>` — the list is mirrored by ck_audit_events_action. */
export const AuditAction = {
  /** Listings (target type `listing`): the owner's writing and publishing, an admin's suspension. */
  LISTING_CREATED: 'listing.created',
  LISTING_UPDATED: 'listing.updated',
  LISTING_PUBLISHED: 'listing.published',
  LISTING_UNPUBLISHED: 'listing.unpublished',
  LISTING_SUSPENDED: 'listing.suspended',
  /** Viewings (target type `viewing`): the tenant's request, the owner's answer, a cancellation by either side, the scheduler's expiry. */
  VIEWING_REQUESTED: 'viewing.requested',
  VIEWING_CONFIRMED: 'viewing.confirmed',
  VIEWING_DECLINED: 'viewing.declined',
  VIEWING_CANCELLED: 'viewing.cancelled',
  VIEWING_EXPIRED: 'viewing.expired',
  /** The account itself (target type `user`): created at sign-up, renamed by its owner. */
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  /** Security log — target type `user`. */
  AUTH_SIGNED_IN: 'auth.signed_in',
  AUTH_SIGN_IN_FAILED: 'auth.sign_in_failed',
  AUTH_SIGNED_OUT: 'auth.signed_out',
  AUTH_EMAIL_VERIFIED: 'auth.email_verified',
  AUTH_PASSWORD_CHANGED: 'auth.password_changed',
  /** "Forgot password": a new password set through the emailed link; every session ended. */
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  AUTH_SESSION_ENDED: 'auth.session_ended',
  AUTH_OTHER_SESSIONS_ENDED: 'auth.other_sessions_ended',
  /** A sign-in elsewhere ended the least recently used session (per-user limit). */
  AUTH_SESSION_EVICTED: 'auth.session_evicted',
  /** Too many wrong passwords from one IP: sign-in blocked there for a while. */
  AUTH_SIGN_IN_LOCKED: 'auth.sign_in_locked',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
export const AUDIT_ACTIONS = Object.values(AuditAction) as [AuditAction, ...AuditAction[]];

/** Mirrored by ck_audit_events_target_type. */
export const AuditTargetType = {
  USER: 'user',
  LISTING: 'listing',
  VIEWING: 'viewing',
} as const;
export type AuditTargetType = (typeof AuditTargetType)[keyof typeof AuditTargetType];
export const AUDIT_TARGET_TYPES = Object.values(AuditTargetType) as [
  AuditTargetType,
  ...AuditTargetType[],
];
