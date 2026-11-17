UPDATE "saved_searches"
SET "criteria" = ("criteria" - 'isPetFriendly' - 'isFurnished' - 'hasParking' - 'moveInAt')
    || jsonb_strip_nulls(jsonb_build_object(
        'pets', "criteria" -> 'isPetFriendly',
        'furnished', "criteria" -> 'isFurnished',
        'parking', "criteria" -> 'hasParking',
        'availableBy', "criteria" -> 'moveInAt'
    ))
WHERE "criteria" ?| ARRAY['isPetFriendly', 'isFurnished', 'hasParking', 'moveInAt'];

ALTER INDEX "idx_saved_searches_has_email_alerts_last_notified_at" RENAME TO "idx_saved_searches_email_alerts_last_notified_at";
ALTER TABLE "saved_searches" RENAME COLUMN "has_email_alerts" TO "email_alerts";

ALTER INDEX "idx_listing_views_listing_id_viewed_at" RENAME TO "idx_listing_views_listing_id_viewed_on";
ALTER TABLE "listing_views" RENAME COLUMN "viewed_at" TO "viewed_on";

ALTER INDEX "idx_listings_published_kind_available_at" RENAME TO "idx_listings_published_kind_available_from";
ALTER TABLE "listings" RENAME CONSTRAINT "ck_listings_available_at" TO "ck_listings_available_from";
ALTER TABLE "listings" RENAME COLUMN "available_at" TO "available_from";
ALTER TABLE "listings" RENAME COLUMN "has_parking" TO "parking";
ALTER TABLE "listings" RENAME COLUMN "is_furnished" TO "furnished";
ALTER TABLE "listings" RENAME COLUMN "is_pet_friendly" TO "pets_allowed";
