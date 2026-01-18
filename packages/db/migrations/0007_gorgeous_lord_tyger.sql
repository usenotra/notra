DROP INDEX "posts_organizationId_idx";--> statement-breakpoint
DROP INDEX "posts_createdAt_id_idx";--> statement-breakpoint
CREATE INDEX "posts_org_createdAt_id_idx" ON "posts" USING btree ("organization_id","created_at","id");