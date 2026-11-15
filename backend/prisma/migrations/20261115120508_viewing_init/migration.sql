-- CreateTable
CREATE TABLE "viewing_schedules" (
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

    CONSTRAINT "pk_viewing_schedules" PRIMARY KEY ("listing_id")
);

-- CreateTable
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

    CONSTRAINT "pk_viewings" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_viewings_listing_id_starts_at" ON "viewings"("listing_id", "starts_at");

-- CreateIndex
CREATE INDEX "idx_viewings_tenant_id_starts_at" ON "viewings"("tenant_id", "starts_at");

-- CreateIndex
CREATE INDEX "idx_viewings_status_starts_at" ON "viewings"("status", "starts_at");

-- AddForeignKey
ALTER TABLE "viewing_schedules" ADD CONSTRAINT "fk_viewing_schedules_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewings" ADD CONSTRAINT "fk_viewings_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewings" ADD CONSTRAINT "fk_viewings_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Viewings (M2): the owner's hours, and the tenants' bookings in them.
ALTER TABLE "viewing_schedules"
    ADD CONSTRAINT "ck_viewing_schedules_slot_minutes" CHECK ("slot_minutes" IN (15, 20, 30, 45, 60)),
    ADD CONSTRAINT "ck_viewing_schedules_notice_hours" CHECK ("notice_hours" BETWEEN 0 AND 168),
    ADD CONSTRAINT "ck_viewing_schedules_horizon_days" CHECK ("horizon_days" BETWEEN 1 AND 60);

ALTER TABLE "viewings"
    ADD CONSTRAINT "ck_viewings_status" CHECK ("status" IN ('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'EXPIRED')),
    ADD CONSTRAINT "ck_viewings_period" CHECK ("ends_at" > "starts_at"),
    ADD CONSTRAINT "ck_viewings_cancelled_by" CHECK (("cancelled_by" IS NOT NULL) = ("status" = 'CANCELLED')),
    ADD CONSTRAINT "ck_viewings_cancelled_by_value" CHECK ("cancelled_by" IS NULL OR "cancelled_by" IN ('TENANT', 'OWNER'));

-- No double booking: at most one live request or confirmed viewing per home and slot. Two
-- concurrent requests for the same slot race on this index; the loser answers 409.
CREATE UNIQUE INDEX "uq_viewings_listing_slot_active" ON "viewings"("listing_id", "starts_at")
    WHERE "status" IN ('REQUESTED', 'CONFIRMED');
-- One live viewing per tenant and home (ask again once it was answered or cancelled).
CREATE UNIQUE INDEX "uq_viewings_tenant_listing_active" ON "viewings"("tenant_id", "listing_id")
    WHERE "status" IN ('REQUESTED', 'CONFIRMED');

-- The viewing joins the audited resources (mirrors AuditAction / AuditTargetType).
ALTER TABLE "audit_events" DROP CONSTRAINT "ck_audit_events_action";
ALTER TABLE "audit_events" ADD CONSTRAINT "ck_audit_events_action" CHECK ("action" IN (
    'listing.created', 'listing.updated', 'listing.published', 'listing.unpublished', 'listing.suspended',
    'viewing.requested', 'viewing.confirmed', 'viewing.declined', 'viewing.cancelled', 'viewing.expired',
    'user.registered', 'user.updated',
    'auth.signed_in', 'auth.sign_in_failed', 'auth.signed_out', 'auth.email_verified',
    'auth.password_changed', 'auth.password_reset', 'auth.session_ended',
    'auth.other_sessions_ended', 'auth.session_evicted', 'auth.sign_in_locked'
));
ALTER TABLE "audit_events" DROP CONSTRAINT "ck_audit_events_target_type";
ALTER TABLE "audit_events" ADD CONSTRAINT "ck_audit_events_target_type" CHECK ("target_type" IN ('user', 'listing', 'viewing'));
