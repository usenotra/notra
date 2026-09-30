CREATE TABLE "demo_request_log" (
	"id" text PRIMARY KEY NOT NULL,
	"anonymous_id" text NOT NULL,
	"source" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"request_body" text,
	"response_body" text,
	"affected" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_sandboxes" (
	"anonymous_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"api_key" text,
	"api_key_id" text,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"anchor_at" timestamp NOT NULL,
	"ip_hash" text,
	"personalization" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "demo_request_log" ADD CONSTRAINT "demo_request_log_anonymous_id_demo_sandboxes_anonymous_id_fk" FOREIGN KEY ("anonymous_id") REFERENCES "public"."demo_sandboxes"("anonymous_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_sandboxes" ADD CONSTRAINT "demo_sandboxes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_sandboxes" ADD CONSTRAINT "demo_sandboxes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demo_request_log_anonymous_id_created_at_idx" ON "demo_request_log" USING btree ("anonymous_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "demo_sandboxes_organization_id_uidx" ON "demo_sandboxes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "demo_sandboxes_expires_at_idx" ON "demo_sandboxes" USING btree ("expires_at");