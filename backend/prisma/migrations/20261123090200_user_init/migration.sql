CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(32),
    "role" VARCHAR(32) NOT NULL,
    "agency_id" UUID,
    "email_verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_users" PRIMARY KEY ("id"),
    CONSTRAINT "ck_users_role" CHECK ("role" IN ('TENANT', 'LANDLORD', 'AGENT', 'ADMIN')),
    CONSTRAINT "ck_users_agency" CHECK (("role" = 'AGENT') = ("agency_id" IS NOT NULL)),
    CONSTRAINT "ck_users_email_lower" CHECK ("email" = lower("email"))
);

CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");
CREATE INDEX "idx_users_agency_id" ON "users"("agency_id");

ALTER TABLE "users" ADD CONSTRAINT "fk_users_agency_id" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
