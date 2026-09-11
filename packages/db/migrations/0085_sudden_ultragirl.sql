CREATE TABLE "content_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"post_id" text NOT NULL,
	"repository_id" text NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"path" text NOT NULL,
	"branch" text NOT NULL,
	"pull_request_number" integer NOT NULL,
	"pull_request_url" text NOT NULL,
	"head_sha" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "chatSessions_org_externalChannel_uidx";--> statement-breakpoint
ALTER TABLE "content_publications" ADD CONSTRAINT "content_publications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_publications" ADD CONSTRAINT "content_publications_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_publications" ADD CONSTRAINT "content_publications_repository_id_github_integrations_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contentPublications_organizationId_idx" ON "content_publications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contentPublications_postId_idx" ON "content_publications" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contentPublications_repository_pullRequest_uidx" ON "content_publications" USING btree ("repository_id","pull_request_number");--> statement-breakpoint
CREATE UNIQUE INDEX "contentPublications_open_post_uidx" ON "content_publications" USING btree ("post_id") WHERE "content_publications"."status" = 'open';--> statement-breakpoint
CREATE INDEX "contentPublications_org_owner_repo_pr_idx" ON "content_publications" USING btree ("organization_id","owner","repo","pull_request_number");--> statement-breakpoint
CREATE INDEX "socialConnections_provider_providerAccountId_idx" ON "social_connections" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chatSessions_org_externalChannel_uidx" ON "chat_sessions" USING btree ("organization_id","external_channel_source","external_channel_id") WHERE "chat_sessions"."external_channel_source" IN ('discord', 'slack', 'github') AND "chat_sessions"."external_channel_id" IS NOT NULL AND "chat_sessions"."deleted_at" IS NULL;