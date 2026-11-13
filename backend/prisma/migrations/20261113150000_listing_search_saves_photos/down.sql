DROP TABLE "saved_searches";
DROP TABLE "listing_views";
DROP TABLE "saved_listings";
DROP INDEX "idx_listing_photos_status_created_at";
DROP INDEX "uq_listing_photos_storage_key";
DELETE FROM "listing_photos" WHERE "url" IS NULL;
ALTER TABLE "listing_photos"
    DROP CONSTRAINT "ck_listing_photos_position_range",
    DROP CONSTRAINT "ck_listing_photos_position_status",
    DROP CONSTRAINT "ck_listing_photos_source",
    DROP CONSTRAINT "ck_listing_photos_status",
    DROP COLUMN "created_by",
    DROP COLUMN "status",
    DROP COLUMN "size_bytes",
    DROP COLUMN "content_type",
    DROP COLUMN "storage_key",
    ALTER COLUMN "position" SET NOT NULL,
    ALTER COLUMN "url" SET NOT NULL;
ALTER TABLE "listing_photos" ADD CONSTRAINT "ck_listing_photos_position" CHECK ("position" BETWEEN 0 AND 19);
DROP INDEX "idx_listings_published_available_from";
DROP INDEX "idx_listings_published_bedrooms";
DROP INDEX "idx_listings_search_trgm";
DROP EXTENSION IF EXISTS pg_trgm;
