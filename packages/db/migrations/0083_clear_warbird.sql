DROP INDEX IF EXISTS "organizations_slug_uidx";--> statement-breakpoint
CREATE INDEX "brandSitemapPages_sitemap_category_wordCount_idx" ON "brand_sitemap_pages" USING btree ("sitemap_id","category","word_count" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "geoContentBriefs_project_source_updated_idx" ON "geo_content_briefs" USING btree ("project_id","source_kind","source_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "geoMentionChecks_project_captured_cover_idx" ON "geo_mention_checks" USING btree ("project_id","captured_at","organization_id","language","engine","prompt_id","mentioned","position","sentiment") WHERE "geo_mention_checks"."sequence_id" IS NULL;--> statement-breakpoint
CREATE INDEX "geoMentionChecks_project_prompt_engine_captured_idx" ON "geo_mention_checks" USING btree ("project_id","prompt_id","engine","captured_at" DESC NULLS LAST) WHERE "geo_mention_checks"."sequence_id" IS NULL;--> statement-breakpoint
CREATE INDEX "geoMentionChecks_sequence_turn_engine_captured_idx" ON "geo_mention_checks" USING btree ("sequence_id","turn","engine","captured_at" DESC NULLS LAST) WHERE "geo_mention_checks"."sequence_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "geoPrompts_projectId_createdAt_idx" ON "geo_prompts" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "members_organizationId_userId_uidx" ON "members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "posts_org_createdAt_status_idx" ON "posts" USING btree ("organization_id","created_at","status");--> statement-breakpoint
CREATE INDEX "posts_org_published_createdAt_idx" ON "posts" USING btree ("organization_id","created_at") WHERE "posts"."status" = 'published';--> statement-breakpoint
CREATE INDEX "posts_org_content_type_updated_at_idx" ON "posts" USING btree ("organization_id","content_type","updated_at" DESC NULLS LAST);