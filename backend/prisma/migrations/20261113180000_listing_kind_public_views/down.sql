DROP INDEX "uq_listing_views_visitor_day";
DROP INDEX "uq_listing_views_user_day";
DELETE FROM "listing_views" WHERE "user_id" IS NULL;
ALTER TABLE "listing_views"
    DROP CONSTRAINT "ck_listing_views_viewer",
    DROP CONSTRAINT "pk_listing_views",
    DROP COLUMN "visitor_key",
    DROP COLUMN "id",
    ALTER COLUMN "user_id" SET NOT NULL,
    ADD CONSTRAINT "pk_listing_views" PRIMARY KEY ("listing_id", "user_id", "viewed_on");

DROP INDEX "idx_listings_published_kind_property_type";
DROP INDEX "idx_listings_published_kind_available_from";
DROP INDEX "idx_listings_published_kind_bedrooms";
DROP INDEX "idx_listings_published_kind_price";
DROP INDEX "idx_listings_published_kind_published_at";
DELETE FROM "listings" WHERE "kind" = 'SALE';
ALTER TABLE "listings"
    DROP CONSTRAINT "ck_listings_available_from",
    DROP CONSTRAINT "ck_listings_kind",
    ALTER COLUMN "available_from" SET NOT NULL,
    DROP COLUMN "kind";
ALTER TABLE "listings" RENAME COLUMN "price" TO "rent";
ALTER TABLE "listings" RENAME CONSTRAINT "ck_listings_price" TO "ck_listings_rent";
CREATE INDEX "idx_listings_status_rent" ON "listings"("status", "rent");
CREATE INDEX "idx_listings_status_published_at" ON "listings"("status", "published_at");
CREATE INDEX "idx_listings_published_bedrooms" ON "listings"("bedrooms", "rent") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_published_available_from" ON "listings"("available_from") WHERE "status" = 'PUBLISHED';
