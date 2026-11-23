CREATE TABLE "viewing_schedules" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "listing_id" UUID NOT NULL,
    "slot_minutes" SMALLINT NOT NULL,
    "notice_hours" SMALLINT NOT NULL,
    "horizon_days" SMALLINT NOT NULL,
    "windows" JSONB NOT NULL,
    "blocked_days" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_viewing_schedules" PRIMARY KEY ("id"),
    CONSTRAINT "ck_viewing_schedules_slot_minutes" CHECK ("slot_minutes" IN (15, 20, 30, 45, 60)),
    CONSTRAINT "ck_viewing_schedules_notice_hours" CHECK ("notice_hours" >= 0 AND "notice_hours" <= 168),
    CONSTRAINT "ck_viewing_schedules_horizon_days" CHECK ("horizon_days" >= 1 AND "horizon_days" <= 60)
);

CREATE UNIQUE INDEX "uq_viewing_schedules_listing_id" ON "viewing_schedules"("listing_id");

ALTER TABLE "viewing_schedules" ADD CONSTRAINT "fk_viewing_schedules_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "viewings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "listing_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "message" VARCHAR(500),
    "note" VARCHAR(300),
    "cancelled_by" VARCHAR(16),
    "decided_at" TIMESTAMPTZ(3),
    "reminder_sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_viewings" PRIMARY KEY ("id"),
    CONSTRAINT "ck_viewings_status" CHECK ("status" IN ('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'EXPIRED')),
    CONSTRAINT "ck_viewings_period" CHECK ("ends_at" > "starts_at"),
    CONSTRAINT "ck_viewings_cancelled_by" CHECK (("cancelled_by" IS NOT NULL) = ("status" = 'CANCELLED')),
    CONSTRAINT "ck_viewings_cancelled_by_value" CHECK ("cancelled_by" IS NULL OR "cancelled_by" IN ('TENANT', 'OWNER'))
);

CREATE INDEX "idx_viewings_listing_id_starts_at" ON "viewings"("listing_id", "starts_at");
CREATE INDEX "idx_viewings_tenant_id_starts_at" ON "viewings"("tenant_id", "starts_at");
CREATE INDEX "idx_viewings_status_starts_at" ON "viewings"("status", "starts_at");
CREATE UNIQUE INDEX "uq_viewings_listing_id_starts_at" ON "viewings"("listing_id", "starts_at") WHERE "status" IN ('REQUESTED', 'CONFIRMED');
CREATE UNIQUE INDEX "uq_viewings_tenant_id_listing_id" ON "viewings"("tenant_id", "listing_id") WHERE "status" IN ('REQUESTED', 'CONFIRMED');

ALTER TABLE "viewings" ADD CONSTRAINT "fk_viewings_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viewings" ADD CONSTRAINT "fk_viewings_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_events" DROP CONSTRAINT "ck_audit_events_action";
ALTER TABLE "audit_events" ADD CONSTRAINT "ck_audit_events_action" CHECK ("action" IN (
    'listing.created', 'listing.updated', 'listing.published', 'listing.unpublished', 'listing.suspended',
    'viewing.requested', 'viewing.confirmed', 'viewing.declined', 'viewing.cancelled', 'viewing.expired',
    'user.registered', 'user.updated', 'user.erased',
    'auth.signed_in', 'auth.sign_in_failed', 'auth.signed_out', 'auth.email_verified',
    'auth.password_changed', 'auth.password_reset', 'auth.session_ended',
    'auth.other_sessions_ended', 'auth.session_evicted', 'auth.sign_in_locked'
));
ALTER TABLE "audit_events" DROP CONSTRAINT "ck_audit_events_target_type";
ALTER TABLE "audit_events" ADD CONSTRAINT "ck_audit_events_target_type" CHECK ("target_type" IN ('user', 'listing', 'viewing'));
