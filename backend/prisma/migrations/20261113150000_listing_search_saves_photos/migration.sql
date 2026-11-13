-- M1: typo-tolerant search, saved homes and searches, views, uploaded photos.

-- Trigram matching for the search box (pg_trgm is a trusted extension: no superuser needed).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- The text the search box matches, indexed for `<%` (word similarity) — the query uses the
-- same expression, so the planner picks the index.
CREATE INDEX "idx_listings_search_trgm" ON "listings"
    USING gin ((("title" || ' ' || coalesce("neighborhood", '') || ' ' || "zip")) gin_trgm_ops);
-- The filters of the search page, published listings only.
CREATE INDEX "idx_listings_published_bedrooms" ON "listings"("bedrooms", "rent") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_published_available_from" ON "listings"("available_from") WHERE "status" = 'PUBLISHED';

-- Photos: uploaded ones live in object storage (storage_key), seeded ones keep an external url.
-- The M0 position CHECK assumed a NOT NULL column; it is replaced below.
ALTER TABLE "listing_photos" DROP CONSTRAINT "ck_listing_photos_position";
ALTER TABLE "listing_photos"
    ALTER COLUMN "url" DROP NOT NULL,
    ALTER COLUMN "position" DROP NOT NULL,
    ADD COLUMN "storage_key" VARCHAR(255),
    ADD COLUMN "content_type" VARCHAR(64),
    ADD COLUMN "size_bytes" INTEGER,
    ADD COLUMN "status" VARCHAR(16) NOT NULL DEFAULT 'READY',
    ADD COLUMN "created_by" UUID,
    ADD CONSTRAINT "ck_listing_photos_status" CHECK ("status" IN ('PENDING', 'READY')),
    -- Exactly one source: an external url or a stored object.
    ADD CONSTRAINT "ck_listing_photos_source" CHECK (("url" IS NULL) <> ("storage_key" IS NULL)),
    -- A shown (READY) photo has its place; a pending intent has none.
    ADD CONSTRAINT "ck_listing_photos_position_status" CHECK (("status" = 'READY') = ("position" IS NOT NULL)),
    ADD CONSTRAINT "ck_listing_photos_position_range" CHECK ("position" IS NULL OR "position" BETWEEN 0 AND 19);

CREATE UNIQUE INDEX "uq_listing_photos_storage_key" ON "listing_photos"("storage_key");
CREATE INDEX "idx_listing_photos_status_created_at" ON "listing_photos"("status", "created_at");

-- A tenant's saved homes.
CREATE TABLE "saved_listings" (
    "user_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_saved_listings" PRIMARY KEY ("user_id", "listing_id")
);
CREATE INDEX "idx_saved_listings_listing_id" ON "saved_listings"("listing_id");
ALTER TABLE "saved_listings" ADD CONSTRAINT "fk_saved_listings_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_listings" ADD CONSTRAINT "fk_saved_listings_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Who opened a listing page, once per person and UTC day.
CREATE TABLE "listing_views" (
    "listing_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "viewed_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_listing_views" PRIMARY KEY ("listing_id", "user_id", "viewed_on")
);
CREATE INDEX "idx_listing_views_user_id" ON "listing_views"("user_id");
ALTER TABLE "listing_views" ADD CONSTRAINT "fk_listing_views_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_views" ADD CONSTRAINT "fk_listing_views_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A tenant's saved searches; the filters are a validated JSON document.
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "criteria" JSONB NOT NULL,
    "email_alerts" BOOLEAN NOT NULL DEFAULT true,
    "last_notified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_saved_searches" PRIMARY KEY ("id")
);
CREATE INDEX "idx_saved_searches_user_id_created_at" ON "saved_searches"("user_id", "created_at");
CREATE INDEX "idx_saved_searches_email_alerts_last_notified_at" ON "saved_searches"("email_alerts", "last_notified_at");
ALTER TABLE "saved_searches" ADD CONSTRAINT "fk_saved_searches_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
