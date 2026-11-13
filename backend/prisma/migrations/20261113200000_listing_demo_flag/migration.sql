-- Showcase rows of the public demo: the seed marks its listings, nobody edits them (DEMO_MODE).
ALTER TABLE "listings" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;
