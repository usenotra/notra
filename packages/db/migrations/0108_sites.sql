CREATE TABLE "site_deployments" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"preview_key" text,
	"trigger" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"generation" integer NOT NULL,
	"branch" text NOT NULL,
	"commit_sha" text NOT NULL,
	"commit_message" text,
	"commit_author" text,
	"pull_request_number" integer,
	"target" jsonb NOT NULL,
	"config_hash" text NOT NULL,
	"toolchain_version" text,
	"file_count" integer,
	"total_bytes" integer,
	"build_duration_ms" integer,
	"diagnostics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_message" text,
	"check_run_id" text,
	"requested_by_user_id" text,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"hostname" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cloudflare_hostname_id" text,
	"verification_records" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_error" text,
	"last_checked_at" timestamp,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"path" text NOT NULL,
	"content" text NOT NULL,
	"base_blob_sha" text,
	"base_commit_sha" text,
	"deleted" boolean DEFAULT false NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"deployment_id" text,
	"kind" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"lease_until" timestamp,
	"dispatched_at" timestamp,
	"last_error" text,
	"dedupe_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_webhook_deliveries" (
	"delivery_id" text PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"repository_id" text,
	"github_installation_id" text,
	"github_repository_id" text,
	"repository_owner" text,
	"repository_name" text,
	"production_branch" text DEFAULT 'main' NOT NULL,
	"root_directory" text DEFAULT '' NOT NULL,
	"public_origin" text NOT NULL,
	"mounts" jsonb NOT NULL,
	"previews_enabled" boolean DEFAULT true NOT NULL,
	"preview_visibility" text DEFAULT 'protected' NOT NULL,
	"publish_mode" text DEFAULT 'pull_request' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"suspended_reason" text,
	"last_generation" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "site_deployments_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "site_deployments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "site_deployments_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "site_domains_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "site_domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_drafts" ADD CONSTRAINT "site_drafts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_drafts" ADD CONSTRAINT "site_drafts_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_jobs" ADD CONSTRAINT "site_jobs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_jobs" ADD CONSTRAINT "site_jobs_deployment_id_site_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."site_deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_repository_id_github_integrations_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "siteDeployments_site_created_idx" ON "site_deployments" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "siteDeployments_site_generation_uidx" ON "site_deployments" USING btree ("site_id","generation");--> statement-breakpoint
CREATE INDEX "siteDeployments_site_preview_idx" ON "site_deployments" USING btree ("site_id","preview_key");--> statement-breakpoint
CREATE INDEX "siteDomains_siteId_idx" ON "site_domains" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "siteDomains_site_hostname_uidx" ON "site_domains" USING btree ("site_id","hostname");--> statement-breakpoint
CREATE UNIQUE INDEX "siteDomains_active_hostname_uidx" ON "site_domains" USING btree ("hostname") WHERE "site_domains"."status" = 'active';--> statement-breakpoint
CREATE INDEX "siteDomains_hostname_idx" ON "site_domains" USING btree ("hostname");--> statement-breakpoint
CREATE UNIQUE INDEX "siteDrafts_site_path_uidx" ON "site_drafts" USING btree ("site_id","path");--> statement-breakpoint
CREATE INDEX "siteJobs_due_idx" ON "site_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "siteJobs_dedupeKey_uidx" ON "site_jobs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "sites_organizationId_idx" ON "sites" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_slug_uidx" ON "sites" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sites_githubRepositoryId_idx" ON "sites" USING btree ("github_repository_id");