CREATE TABLE "geo_scan_events" (
	"id" text PRIMARY KEY NOT NULL,
	"scan_id" text NOT NULL,
	"run_id" text NOT NULL,
	"step" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"duration_ms" integer NOT NULL,
	"engine" text,
	"task_key" text,
	"error_code" text,
	"error_message" text,
	"usage" jsonb
);
--> statement-breakpoint
ALTER TABLE "geo_mention_checks" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "geo_mention_checks" ADD COLUMN "cost_usd" real;--> statement-breakpoint
ALTER TABLE "geo_mention_checks" ADD COLUMN "judge_tokens" integer;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "run_id" text;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "cache_read_tokens" integer;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "cache_write_tokens" integer;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "reasoning_tokens" integer;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "total_usd" real;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "checks_total" integer;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "checks_failed" integer;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "mentions" integer;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "usage_by_role" jsonb;--> statement-breakpoint
ALTER TABLE "geo_scan_events" ADD CONSTRAINT "geo_scan_events_scan_id_geo_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."geo_scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "geoScanEvents_scanId_startedAt_idx" ON "geo_scan_events" USING btree ("scan_id","started_at");