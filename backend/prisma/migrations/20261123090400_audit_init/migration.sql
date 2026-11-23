CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(64) NOT NULL,
    "actor_user_id" UUID,
    "target_type" VARCHAR(32) NOT NULL,
    "target_id" UUID NOT NULL,
    "target_label" VARCHAR(255) NOT NULL,
    "subject_id" UUID,
    "changes" JSONB NOT NULL,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "trace_id" VARCHAR(64),

    CONSTRAINT "pk_audit_events" PRIMARY KEY ("id"),
    CONSTRAINT "ck_audit_events_action" CHECK ("action" IN (
        'user.registered', 'user.updated', 'user.erased',
        'auth.signed_in', 'auth.sign_in_failed', 'auth.signed_out', 'auth.email_verified',
        'auth.password_changed', 'auth.password_reset', 'auth.session_ended',
        'auth.other_sessions_ended', 'auth.session_evicted', 'auth.sign_in_locked'
    )),
    CONSTRAINT "ck_audit_events_target_type" CHECK ("target_type" IN ('user'))
);

CREATE INDEX "idx_audit_events_actor_user_id" ON "audit_events"("actor_user_id");
CREATE INDEX "idx_audit_events_target_id_occurred_at" ON "audit_events"("target_id", "occurred_at");
CREATE INDEX "idx_audit_events_subject_id_occurred_at" ON "audit_events"("subject_id", "occurred_at");

ALTER TABLE "audit_events" ADD CONSTRAINT "fk_audit_events_actor_user_id" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION audit_events_reject_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_audit_events_no_update_delete"
    BEFORE UPDATE OR DELETE ON "audit_events"
    FOR EACH ROW EXECUTE FUNCTION audit_events_reject_change();

CREATE TRIGGER "trg_audit_events_no_truncate"
    BEFORE TRUNCATE ON "audit_events"
    FOR EACH STATEMENT EXECUTE FUNCTION audit_events_reject_change();
