-- The owner's writing of a listing joins the audited actions (mirrors AuditAction).
ALTER TABLE "audit_events" DROP CONSTRAINT "ck_audit_events_action";
ALTER TABLE "audit_events" ADD CONSTRAINT "ck_audit_events_action" CHECK ("action" IN (
    'listing.created', 'listing.updated', 'listing.published', 'listing.unpublished', 'listing.suspended',
    'user.registered', 'user.updated',
    'auth.signed_in', 'auth.sign_in_failed', 'auth.signed_out', 'auth.email_verified',
    'auth.password_changed', 'auth.password_reset', 'auth.session_ended',
    'auth.other_sessions_ended', 'auth.session_evicted', 'auth.sign_in_locked'
));
