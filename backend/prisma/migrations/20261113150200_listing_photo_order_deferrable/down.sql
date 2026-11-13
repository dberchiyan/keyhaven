ALTER TABLE "listing_photos" DROP CONSTRAINT "uq_listing_photos_listing_id_position";
CREATE UNIQUE INDEX "uq_listing_photos_listing_id_position" ON "listing_photos"("listing_id", "position");
