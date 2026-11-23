CREATE TABLE "agencies" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "website" VARCHAR(255),
    "description" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_agencies" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_agencies_name" ON "agencies"("name");
