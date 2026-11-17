ALTER TABLE "listings" RENAME COLUMN "pets_allowed" TO "is_pet_friendly";
ALTER TABLE "listings" RENAME COLUMN "furnished" TO "is_furnished";
ALTER TABLE "listings" RENAME COLUMN "parking" TO "has_parking";
ALTER TABLE "listings" RENAME COLUMN "available_from" TO "available_at";
ALTER TABLE "listings" RENAME CONSTRAINT "ck_listings_available_from" TO "ck_listings_available_at";
ALTER INDEX "idx_listings_published_kind_available_from" RENAME TO "idx_listings_published_kind_available_at";

ALTER TABLE "listing_views" RENAME COLUMN "viewed_on" TO "viewed_at";
ALTER INDEX "idx_listing_views_listing_id_viewed_on" RENAME TO "idx_listing_views_listing_id_viewed_at";

ALTER TABLE "saved_searches" RENAME COLUMN "email_alerts" TO "has_email_alerts";
ALTER INDEX "idx_saved_searches_email_alerts_last_notified_at" RENAME TO "idx_saved_searches_has_email_alerts_last_notified_at";

UPDATE "saved_searches"
SET "criteria" = ("criteria" - 'pets' - 'furnished' - 'parking' - 'availableBy')
    || jsonb_strip_nulls(jsonb_build_object(
        'isPetFriendly', "criteria" -> 'pets',
        'isFurnished', "criteria" -> 'furnished',
        'hasParking', "criteria" -> 'parking',
        'moveInAt', "criteria" -> 'availableBy'
    ))
WHERE "criteria" ?| ARRAY['pets', 'furnished', 'parking', 'availableBy'];
