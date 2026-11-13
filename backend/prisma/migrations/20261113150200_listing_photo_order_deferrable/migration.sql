-- Reordering photos swaps positions inside one transaction: the uniqueness of (listing, position)
-- is checked at commit, so a swap never trips it half-way (the only deferrable constraint; the
-- repository renumbers the whole gallery in one statement).
DROP INDEX "uq_listing_photos_listing_id_position";
ALTER TABLE "listing_photos" ADD CONSTRAINT "uq_listing_photos_listing_id_position"
    UNIQUE ("listing_id", "position") DEFERRABLE INITIALLY DEFERRED;
