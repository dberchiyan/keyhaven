ALTER TABLE "messages" ADD COLUMN "is_removed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" DROP CONSTRAINT "ck_messages_body";
ALTER TABLE "messages"
    ADD CONSTRAINT "ck_messages_body" CHECK ("is_removed" OR length("body") > 0),
    ADD CONSTRAINT "ck_messages_removed_body" CHECK (NOT "is_removed" OR "body" = '');

ALTER TABLE "audit_events" DROP CONSTRAINT "ck_audit_events_action";
ALTER TABLE "audit_events" ADD CONSTRAINT "ck_audit_events_action" CHECK ("action" IN (
    'listing.created', 'listing.updated', 'listing.published', 'listing.unpublished', 'listing.suspended',
    'viewing.requested', 'viewing.confirmed', 'viewing.declined', 'viewing.cancelled', 'viewing.expired',
    'user.registered', 'user.updated', 'user.erased',
    'auth.signed_in', 'auth.sign_in_failed', 'auth.signed_out', 'auth.email_verified',
    'auth.password_changed', 'auth.password_reset', 'auth.session_ended',
    'auth.other_sessions_ended', 'auth.session_evicted', 'auth.sign_in_locked'
));
