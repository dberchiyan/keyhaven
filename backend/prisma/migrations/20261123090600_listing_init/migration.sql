CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(100) NOT NULL,
    "state" CHAR(2) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_cities" PRIMARY KEY ("id"),
    CONSTRAINT "ck_cities_slug" CHECK ("slug" ~ '^[a-z0-9-]+$'),
    CONSTRAINT "ck_cities_state" CHECK ("state" ~ '^[A-Z]{2}$')
);

CREATE UNIQUE INDEX "uq_cities_slug" ON "cities"("slug");

CREATE TABLE "listings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "landlord_id" UUID,
    "agency_id" UUID,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "property_type" VARCHAR(32) NOT NULL,
    "kind" VARCHAR(8) NOT NULL,
    "price" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "bedrooms" SMALLINT NOT NULL,
    "bathrooms" DECIMAL(3,1) NOT NULL,
    "size_sqft" INTEGER NOT NULL,
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "city_id" UUID NOT NULL,
    "neighborhood" VARCHAR(100),
    "zip" VARCHAR(10) NOT NULL,
    "is_pet_friendly" BOOLEAN NOT NULL,
    "is_furnished" BOOLEAN NOT NULL,
    "has_parking" BOOLEAN NOT NULL,
    "available_on" DATE,
    "status" VARCHAR(16) NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_listings" PRIMARY KEY ("id"),
    CONSTRAINT "ck_listings_owner" CHECK (("landlord_id" IS NULL) <> ("agency_id" IS NULL)),
    CONSTRAINT "ck_listings_property_type" CHECK ("property_type" IN ('APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'STUDIO')),
    CONSTRAINT "ck_listings_kind" CHECK ("kind" IN ('RENT', 'SALE')),
    CONSTRAINT "ck_listings_status" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'SUSPENDED')),
    CONSTRAINT "ck_listings_price" CHECK ("price" > 0),
    CONSTRAINT "ck_listings_bedrooms" CHECK ("bedrooms" >= 0 AND "bedrooms" <= 20),
    CONSTRAINT "ck_listings_bathrooms" CHECK ("bathrooms" > 0 AND "bathrooms" <= 20),
    CONSTRAINT "ck_listings_size_sqft" CHECK ("size_sqft" > 0),
    CONSTRAINT "ck_listings_available_on" CHECK (("kind" = 'RENT') = ("available_on" IS NOT NULL)),
    CONSTRAINT "ck_listings_published_at" CHECK ("status" <> 'PUBLISHED' OR "published_at" IS NOT NULL)
);

CREATE INDEX "idx_listings_landlord_id_status" ON "listings"("landlord_id", "status");
CREATE INDEX "idx_listings_agency_id_status" ON "listings"("agency_id", "status");
CREATE INDEX "idx_listings_status_city_id" ON "listings"("status", "city_id");
CREATE INDEX "idx_listings_city_id" ON "listings"("city_id");
CREATE INDEX "idx_listings_kind_published_at" ON "listings"("kind", "published_at") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_kind_price" ON "listings"("kind", "price") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_kind_bedrooms_price" ON "listings"("kind", "bedrooms", "price") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_kind_available_on" ON "listings"("kind", "available_on") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_kind_property_type" ON "listings"("kind", "property_type") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_listings_title_neighborhood_zip" ON "listings"
    USING gin ((("title" || ' ' || coalesce("neighborhood", '') || ' ' || "zip")) gin_trgm_ops);

ALTER TABLE "listings" ADD CONSTRAINT "fk_listings_landlord_id" FOREIGN KEY ("landlord_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "fk_listings_agency_id" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "fk_listings_city_id" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "listing_photos" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "listing_id" UUID NOT NULL,
    "url" VARCHAR(500),
    "storage_key" VARCHAR(255),
    "content_type" VARCHAR(64),
    "size_bytes" INTEGER,
    "status" VARCHAR(16) NOT NULL DEFAULT 'READY',
    "position" SMALLINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_listing_photos" PRIMARY KEY ("id"),
    CONSTRAINT "uq_listing_photos_listing_id_position" UNIQUE ("listing_id", "position") DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT "ck_listing_photos_source" CHECK (("url" IS NULL) <> ("storage_key" IS NULL)),
    CONSTRAINT "ck_listing_photos_status" CHECK ("status" IN ('PENDING', 'READY')),
    CONSTRAINT "ck_listing_photos_position_status" CHECK (("status" = 'READY') = ("position" IS NOT NULL)),
    CONSTRAINT "ck_listing_photos_position_range" CHECK ("position" IS NULL OR ("position" >= 0 AND "position" <= 19))
);

CREATE UNIQUE INDEX "uq_listing_photos_storage_key" ON "listing_photos"("storage_key");
CREATE INDEX "idx_listing_photos_status_created_at" ON "listing_photos"("status", "created_at");

ALTER TABLE "listing_photos" ADD CONSTRAINT "fk_listing_photos_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "saved_listings" (
    "user_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_saved_listings" PRIMARY KEY ("user_id", "listing_id")
);

CREATE INDEX "idx_saved_listings_listing_id_created_at" ON "saved_listings"("listing_id", "created_at");

ALTER TABLE "saved_listings" ADD CONSTRAINT "fk_saved_listings_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_listings" ADD CONSTRAINT "fk_saved_listings_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "listing_views" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "listing_id" UUID NOT NULL,
    "user_id" UUID,
    "visitor_key" CHAR(64),
    "viewed_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_listing_views" PRIMARY KEY ("id"),
    CONSTRAINT "ck_listing_views_viewer" CHECK (("user_id" IS NULL) <> ("visitor_key" IS NULL))
);

CREATE INDEX "idx_listing_views_user_id" ON "listing_views"("user_id");
CREATE INDEX "idx_listing_views_listing_id_viewed_on" ON "listing_views"("listing_id", "viewed_on");
CREATE UNIQUE INDEX "uq_listing_views_listing_id_user_id_viewed_on" ON "listing_views"("listing_id", "user_id", "viewed_on") WHERE "user_id" IS NOT NULL;
CREATE UNIQUE INDEX "uq_listing_views_listing_id_visitor_key_viewed_on" ON "listing_views"("listing_id", "visitor_key", "viewed_on") WHERE "visitor_key" IS NOT NULL;

ALTER TABLE "listing_views" ADD CONSTRAINT "fk_listing_views_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_views" ADD CONSTRAINT "fk_listing_views_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_events" DROP CONSTRAINT "ck_audit_events_action";
ALTER TABLE "audit_events" ADD CONSTRAINT "ck_audit_events_action" CHECK ("action" IN (
    'listing.created', 'listing.updated', 'listing.published', 'listing.unpublished', 'listing.suspended',
    'user.registered', 'user.updated', 'user.erased',
    'auth.signed_in', 'auth.sign_in_failed', 'auth.signed_out', 'auth.email_verified',
    'auth.password_changed', 'auth.password_reset', 'auth.session_ended',
    'auth.other_sessions_ended', 'auth.session_evicted', 'auth.sign_in_locked'
));
ALTER TABLE "audit_events" DROP CONSTRAINT "ck_audit_events_target_type";
ALTER TABLE "audit_events" ADD CONSTRAINT "ck_audit_events_target_type" CHECK ("target_type" IN ('user', 'listing'));
