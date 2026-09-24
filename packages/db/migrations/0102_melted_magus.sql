ALTER TABLE "projects" ADD COLUMN "geo_ingest_token_generation" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE "projects" SET "geo_ingest_token_generation" = "organizations"."geo_ingest_token_generation" FROM "organizations" WHERE "projects"."organization_id" = "organizations"."id";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "gsc_site_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "gsc_top_queries" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "gsc_last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "gsc_last_error" text;--> statement-breakpoint
-- The legacy site belongs to the only project when exactly one exists. With
-- multiple projects its owner is unknown, so require a fresh property choice.
UPDATE "projects" SET "gsc_site_url" = gsc.site_url, "gsc_top_queries" = gsc.top_queries, "gsc_last_synced_at" = gsc.last_synced_at, "gsc_last_error" = gsc.last_error FROM "google_search_console_integrations" gsc WHERE "projects"."organization_id" = gsc.organization_id AND (SELECT count(*) FROM "projects" p WHERE p.organization_id = gsc.organization_id) = 1;--> statement-breakpoint
ALTER TABLE "geo_prompt_suggestions" ADD COLUMN "project_id" text;--> statement-breakpoint
-- Keep unowned legacy rows without assigning them to the wrong project. They
-- remain stored but are not returned by project-scoped reads.
UPDATE "geo_prompt_suggestions" s SET "project_id" = COALESCE((SELECT gp.project_id FROM "geo_prompts" gp WHERE gp.id = s.accepted_prompt_id AND gp.organization_id = s.organization_id), (SELECT p.id FROM "projects" p WHERE p.organization_id = s.organization_id ORDER BY p.created_at, p.id LIMIT 1)) WHERE (SELECT count(*) FROM "projects" p WHERE p.organization_id = s.organization_id) = 1 OR s.accepted_prompt_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "geo_prompt_suggestions" ADD CONSTRAINT "geo_prompt_suggestions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP INDEX "geoPromptSuggestions_organizationId_status_idx";--> statement-breakpoint
DROP INDEX "geoPromptSuggestions_organizationId_prompt_uidx";--> statement-breakpoint
CREATE INDEX "geoPromptSuggestions_projectId_status_idx" ON "geo_prompt_suggestions" USING btree ("project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "geoPromptSuggestions_projectId_prompt_uidx" ON "geo_prompt_suggestions" USING btree ("project_id","prompt");
