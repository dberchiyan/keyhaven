-- Homes for rent and for sale, a public catalogue, and views by visitors without an account.

-- A listing is for rent (price = monthly rent) or for sale (price = asking price).
ALTER TABLE "listings" RENAME COLUMN "rent" TO "price";
ALTER TABLE "listings" RENAME CONSTRAINT "ck_listings_rent" TO "ck_listings_price";
ALTER INDEX "idx_listings_status_rent" RENAME TO "idx_listings_status_price";
ALTER INDEX "idx_listings_published_bedrooms" RENAME TO "idx_listings_published_bedrooms_old";
ALTER TABLE "listings"
    ADD COLUMN "kind" VARCHAR(8) NOT NULL DEFAULT 'RENT',
    -- Homes for sale have no move-in day.
    ALTER COLUMN "available_from" DROP NOT NULL,
    ADD CONSTRAINT "ck_listings_kind" CHECK ("kind" IN ('RENT', 'SALE')),
    ADD CONSTRAINT "ck_listings_available_from" CHECK (("kind" = 'RENT') = ("available_from" IS NOT NULL));
ALTER TABLE "listings" ALTER COLUMN "kind" DROP DEFAULT;

-- Every search starts with the kind, so it leads the published-only indexes.
DROP INDEX "idx_listings_published_bedrooms_old";
DROP INDEX "idx_listings_published_available_from";
DROP INDEX "idx_listings_status_price";
DROP INDEX "idx_listings_status_published_at";
CREATE INDEX "idx_listings_published_kind_published_at" ON "listings"("kind", "published_at") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_published_kind_price" ON "listings"("kind", "price") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_published_kind_bedrooms" ON "listings"("kind", "bedrooms", "price") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_published_kind_available_from" ON "listings"("kind", "available_from") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_published_kind_property_type" ON "listings"("kind", "property_type") WHERE "status" = 'PUBLISHED';

-- Views: a signed-in person, or a visitor known by a daily hash of their address and browser.
ALTER TABLE "listing_views" DROP CONSTRAINT "pk_listing_views";
ALTER TABLE "listing_views"
    ADD COLUMN "id" UUID NOT NULL DEFAULT uuidv7(),
    ALTER COLUMN "user_id" DROP NOT NULL,
    ADD COLUMN "visitor_key" CHAR(64),
    ADD CONSTRAINT "pk_listing_views" PRIMARY KEY ("id"),
    -- Exactly one of the two: a person, or an anonymous visitor.
    ADD CONSTRAINT "ck_listing_views_viewer" CHECK (("user_id" IS NULL) <> ("visitor_key" IS NULL));
CREATE UNIQUE INDEX "uq_listing_views_user_day" ON "listing_views"("listing_id", "user_id", "viewed_on") WHERE "user_id" IS NOT NULL;
CREATE UNIQUE INDEX "uq_listing_views_visitor_day" ON "listing_views"("listing_id", "visitor_key", "viewed_on") WHERE "visitor_key" IS NOT NULL;
