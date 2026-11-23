ALTER TABLE "audit_events" DROP CONSTRAINT "ck_audit_events_target_type";
ALTER TABLE "audit_events" ADD CONSTRAINT "ck_audit_events_target_type" CHECK ("target_type" IN ('user')) NOT VALID;
ALTER TABLE "audit_events" DROP CONSTRAINT "ck_audit_events_action";
ALTER TABLE "audit_events" ADD CONSTRAINT "ck_audit_events_action" CHECK ("action" IN (
    'user.registered', 'user.updated', 'user.erased',
    'auth.signed_in', 'auth.sign_in_failed', 'auth.signed_out', 'auth.email_verified',
    'auth.password_changed', 'auth.password_reset', 'auth.session_ended',
    'auth.other_sessions_ended', 'auth.session_evicted', 'auth.sign_in_locked'
)) NOT VALID;
DROP TABLE "listing_views";
DROP TABLE "saved_listings";
DROP TABLE "listing_photos";
DROP TABLE "listings";
DROP TABLE "cities";
