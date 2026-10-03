CREATE TYPE "public"."scheduled_publication_destination" AS ENUM('notra', 'github', 'social');--> statement-breakpoint
CREATE TYPE "public"."scheduled_publication_status" AS ENUM('scheduled', 'publishing', 'published', 'failed', 'canceled');--> statement-breakpoint
CREATE TABLE "scheduled_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"post_id" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"time_zone" text NOT NULL,
	"destination" "scheduled_publication_destination" NOT NULL,
	"destination_config" jsonb NOT NULL,
	"status" "scheduled_publication_status" DEFAULT 'scheduled' NOT NULL,
	"next_attempt_at" timestamp NOT NULL,
	"claim_token" text,
	"lease_until" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"external_attempt_at" timestamp,
	"cancel_requested_at" timestamp,
	"error_code" text,
	"last_error" text,
	"result" jsonb,
	"published_at" timestamp,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
UPDATE "posts" SET "published_at" = "updated_at" WHERE "status" = 'published' AND "published_at" IS NULL;--> statement-breakpoint
ALTER TABLE "scheduled_publications" ADD CONSTRAINT "scheduled_publications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_publications" ADD CONSTRAINT "scheduled_publications_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_publications" ADD CONSTRAINT "scheduled_publications_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_publications_due_idx" ON "scheduled_publications" USING btree ("next_attempt_at") WHERE "scheduled_publications"."status" IN ('scheduled', 'publishing');--> statement-breakpoint
CREATE INDEX "scheduled_publications_org_scheduled_at_idx" ON "scheduled_publications" USING btree ("organization_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "scheduled_publications_post_idx" ON "scheduled_publications" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_publications_active_post_destination_uidx" ON "scheduled_publications" USING btree ("post_id","destination") WHERE "scheduled_publications"."status" IN ('scheduled', 'publishing');--> statement-breakpoint
CREATE INDEX "posts_org_published_at_idx" ON "posts" USING btree ("organization_id","published_at") WHERE "posts"."published_at" IS NOT NULL;