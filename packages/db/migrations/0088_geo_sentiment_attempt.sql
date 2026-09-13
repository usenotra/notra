ALTER TABLE "geo_settings" ADD COLUMN IF NOT EXISTS "sentiment_attempted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "geo_settings" DROP COLUMN IF EXISTS "auto_sentiment";
