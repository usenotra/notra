ALTER TABLE "geo_settings" ADD COLUMN "auto_sentiment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "geo_settings" ADD COLUMN "sentiment_attempted_at" timestamp;