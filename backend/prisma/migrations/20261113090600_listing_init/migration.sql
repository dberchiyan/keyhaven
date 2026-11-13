-- The cities Keyhaven serves (reference data) and the homes for rent.
CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(100) NOT NULL,
    "state" CHAR(2) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_cities" PRIMARY KEY ("id"),
    CONSTRAINT "ck_cities_state" CHECK ("state" ~ '^[A-Z]{2}$'),
    CONSTRAINT "ck_cities_slug" CHECK ("slug" ~ '^[a-z0-9-]+$')
);

CREATE UNIQUE INDEX "uq_cities_slug" ON "cities"("slug");

CREATE TABLE "listings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "landlord_id" UUID,
    "agency_id" UUID,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "property_type" VARCHAR(32) NOT NULL,
    "rent" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "bedrooms" SMALLINT NOT NULL,
    "bathrooms" DECIMAL(3,1) NOT NULL,
    "size_sqft" INTEGER NOT NULL,
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "city_id" UUID NOT NULL,
    "neighborhood" VARCHAR(100),
    "zip" VARCHAR(10) NOT NULL,
    "pets_allowed" BOOLEAN NOT NULL,
    "furnished" BOOLEAN NOT NULL,
    "parking" BOOLEAN NOT NULL,
    "available_from" DATE NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_listings" PRIMARY KEY ("id"),
    -- Owned by a landlord or by an agency — exactly one of the two.
    CONSTRAINT "ck_listings_owner" CHECK (("landlord_id" IS NULL) <> ("agency_id" IS NULL)),
    CONSTRAINT "ck_listings_property_type" CHECK ("property_type" IN ('APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'STUDIO')),
    CONSTRAINT "ck_listings_status" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'SUSPENDED')),
    CONSTRAINT "ck_listings_rent" CHECK ("rent" > 0),
    CONSTRAINT "ck_listings_bedrooms" CHECK ("bedrooms" BETWEEN 0 AND 20),
    CONSTRAINT "ck_listings_bathrooms" CHECK ("bathrooms" > 0 AND "bathrooms" <= 20),
    CONSTRAINT "ck_listings_size_sqft" CHECK ("size_sqft" > 0),
    -- A published listing always knows when it was published.
    CONSTRAINT "ck_listings_published_at" CHECK ("status" <> 'PUBLISHED' OR "published_at" IS NOT NULL)
);

CREATE INDEX "idx_listings_landlord_id_status" ON "listings"("landlord_id", "status");
CREATE INDEX "idx_listings_agency_id_status" ON "listings"("agency_id", "status");
CREATE INDEX "idx_listings_status_city_id" ON "listings"("status", "city_id");
CREATE INDEX "idx_listings_status_published_at" ON "listings"("status", "published_at");
CREATE INDEX "idx_listings_status_rent" ON "listings"("status", "rent");
CREATE INDEX "idx_listings_city_id" ON "listings"("city_id");

ALTER TABLE "listings" ADD CONSTRAINT "fk_listings_landlord_id" FOREIGN KEY ("landlord_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "fk_listings_agency_id" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "fk_listings_city_id" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "listing_photos" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "listing_id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_listing_photos" PRIMARY KEY ("id"),
    -- At most 20 photos per listing (MAX_PHOTOS in the listing record).
    CONSTRAINT "ck_listing_photos_position" CHECK ("position" BETWEEN 0 AND 19)
);

CREATE UNIQUE INDEX "uq_listing_photos_listing_id_position" ON "listing_photos"("listing_id", "position");

-- A photo means nothing without its listing.
ALTER TABLE "listing_photos" ADD CONSTRAINT "fk_listing_photos_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
