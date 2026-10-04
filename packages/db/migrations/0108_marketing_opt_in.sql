ALTER TABLE "organization_notification_settings" ALTER COLUMN "marketing_emails" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "marketing_opt_in_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "marketing_opt_in_source" text;