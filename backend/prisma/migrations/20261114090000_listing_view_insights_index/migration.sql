-- Views are counted per listing and day (the owner's insights and the dashboard counts):
-- the FK column had no index at all (data.md), so every count scanned the table.
CREATE INDEX "idx_listing_views_listing_id_viewed_on" ON "listing_views"("listing_id", "viewed_on");
-- Saves per listing and day for the same charts.
CREATE INDEX "idx_saved_listings_listing_id_created_at" ON "saved_listings"("listing_id", "created_at");
