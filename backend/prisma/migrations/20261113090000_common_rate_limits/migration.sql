-- Store of rate-limiter-flexible (security.md → Rate limiting); the structure is the library's own.
-- Created by migration so the app never issues DDL at runtime.
CREATE TABLE "rate_limits" (
    "key" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "expire" BIGINT,

    CONSTRAINT "pk_rate_limits" PRIMARY KEY ("key")
);
