CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "criteria" JSONB NOT NULL,
    "has_email_alerts" BOOLEAN NOT NULL DEFAULT true,
    "last_notified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_saved_searches" PRIMARY KEY ("id")
);

CREATE INDEX "idx_saved_searches_user_id_created_at" ON "saved_searches"("user_id", "created_at");
CREATE INDEX "idx_saved_searches_has_email_alerts_last_notified_at" ON "saved_searches"("has_email_alerts", "last_notified_at");

ALTER TABLE "saved_searches" ADD CONSTRAINT "fk_saved_searches_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
