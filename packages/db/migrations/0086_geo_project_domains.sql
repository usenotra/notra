ALTER TABLE "geo_settings" ADD COLUMN "domains" text[] DEFAULT ARRAY[]::text[] NOT NULL;
