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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL
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
CREATE TABLE "site_slug_grants" (
	"slug" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_webhook_deliveries" (
	"delivery_id" text PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
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
	"show_branding" boolean DEFAULT true NOT NULL,
	"preview_password" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"suspended_reason" text,
	"last_generation" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"active_production_deployment_id" text
);
--> statement-breakpoint
CREATE INDEX "siteDeployments_site_created_idx" ON "site_deployments" USING btree ("site_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "siteDeployments_site_generation_uidx" ON "site_deployments" USING btree ("site_id","generation");
--> statement-breakpoint
CREATE INDEX "siteDeployments_site_preview_idx" ON "site_deployments" USING btree ("site_id","preview_key");
--> statement-breakpoint
CREATE INDEX "siteDomains_siteId_idx" ON "site_domains" USING btree ("site_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "siteDomains_site_hostname_uidx" ON "site_domains" USING btree ("site_id","hostname");
--> statement-breakpoint
CREATE UNIQUE INDEX "siteDomains_active_hostname_uidx" ON "site_domains" USING btree ("hostname") WHERE "site_domains"."status" = 'active';
--> statement-breakpoint
CREATE INDEX "siteDomains_hostname_idx" ON "site_domains" USING btree ("hostname");
--> statement-breakpoint
CREATE UNIQUE INDEX "siteDrafts_site_path_uidx" ON "site_drafts" USING btree ("site_id","path");
--> statement-breakpoint
CREATE INDEX "siteJobs_due_idx" ON "site_jobs" USING btree ("status","available_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "siteJobs_dedupeKey_uidx" ON "site_jobs" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX "sites_organizationId_idx" ON "sites" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sites_slug_uidx" ON "sites" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "sites_githubRepositoryId_idx" ON "sites" USING btree ("github_repository_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "githubAppInstallations_org_id_uidx" ON "github_app_installations" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "githubIntegrations_org_id_uidx" ON "github_integrations" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "posts_org_id_uidx" ON "posts" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "projects_org_id_uidx" ON "projects" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "siteDeployments_site_id_uidx" ON "site_deployments" USING btree ("site_id","id");
--> statement-breakpoint
CREATE INDEX "siteDeployments_org_created_idx" ON "site_deployments" USING btree ("organization_id","created_at");
--> statement-breakpoint
CREATE INDEX "siteJobs_site_deployment_idx" ON "site_jobs" USING btree ("site_id","deployment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sites_org_id_uidx" ON "sites" USING btree ("organization_id","id");
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "site_deployments_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "site_deployments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "site_deployments_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "site_domains_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "site_domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_drafts" ADD CONSTRAINT "site_drafts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_drafts" ADD CONSTRAINT "site_drafts_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_jobs" ADD CONSTRAINT "site_jobs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_slug_grants" ADD CONSTRAINT "site_slug_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_repository_id_github_integrations_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_integrations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_publications" ADD CONSTRAINT "contentPublications_org_post_fk" FOREIGN KEY ("organization_id","post_id") REFERENCES "public"."posts"("organization_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_publications" ADD CONSTRAINT "contentPublications_org_repository_fk" FOREIGN KEY ("organization_id","repository_id") REFERENCES "public"."github_integrations"("organization_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "github_integrations" ADD CONSTRAINT "githubIntegrations_org_installation_fk" FOREIGN KEY ("organization_id","github_app_installation_id") REFERENCES "public"."github_app_installations"("organization_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "siteDeployments_org_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "siteDomains_org_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_jobs" ADD CONSTRAINT "siteJobs_site_deployment_fk" FOREIGN KEY ("site_id","deployment_id") REFERENCES "public"."site_deployments"("site_id","id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_active_production_deployment_id_site_deployments_id_fk" FOREIGN KEY ("active_production_deployment_id") REFERENCES "public"."site_deployments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_org_project_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."projects"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_org_repository_fk" FOREIGN KEY ("organization_id","repository_id") REFERENCES "public"."github_integrations"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_active_production_same_site_fk" FOREIGN KEY ("id","active_production_deployment_id") REFERENCES "public"."site_deployments"("site_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "siteDeployments_kind_check" CHECK ("site_deployments"."kind" IN ('production', 'preview'));
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "siteDeployments_status_check" CHECK ("site_deployments"."status" IN ('queued', 'building', 'uploading', 'ready', 'superseded', 'failed', 'canceled', 'expired'));
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "siteDeployments_trigger_check" CHECK ("site_deployments"."trigger" IN ('push', 'pull_request', 'manual', 'redeploy', 'config'));
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "siteDeployments_generation_check" CHECK ("site_deployments"."generation" >= 0);
--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "siteDomains_kind_check" CHECK ("site_domains"."kind" IN ('subdomain', 'proxy'));
--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "siteDomains_status_check" CHECK ("site_domains"."status" IN ('pending', 'verifying', 'active', 'failed'));
--> statement-breakpoint
ALTER TABLE "site_jobs" ADD CONSTRAINT "siteJobs_kind_check" CHECK ("site_jobs"."kind" IN ('build', 'remove_preview', 'sync_state'));
--> statement-breakpoint
ALTER TABLE "site_jobs" ADD CONSTRAINT "siteJobs_status_check" CHECK ("site_jobs"."status" IN ('pending', 'running', 'done', 'failed'));
--> statement-breakpoint
ALTER TABLE "site_jobs" ADD CONSTRAINT "siteJobs_attempts_check" CHECK ("site_jobs"."attempts" >= 0 AND "site_jobs"."max_attempts" >= 0);
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_status_check" CHECK ("sites"."status" IN ('active', 'suspended'));
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_previewVisibility_check" CHECK ("sites"."preview_visibility" IN ('public', 'protected'));
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_publishMode_check" CHECK ("sites"."publish_mode" IN ('pull_request', 'direct'));
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_lastGeneration_check" CHECK ("sites"."last_generation" >= 0);
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "siteDeployments_previewKey_check" CHECK (("site_deployments"."kind" = 'production' AND "site_deployments"."preview_key" IS NULL) OR ("site_deployments"."kind" = 'preview' AND "site_deployments"."preview_key" IS NOT NULL AND length("site_deployments"."preview_key") > 0));
