ALTER TABLE "geo_scans" ADD COLUMN "plan_summary" jsonb;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "failed_stage" text;--> statement-breakpoint
ALTER TABLE "geo_scans" ADD COLUMN "retryable" boolean;
