DROP INDEX "posts_createdAt_idx";--> statement-breakpoint
CREATE INDEX "posts_createdAt_id_idx" ON "posts" USING btree ("created_at","id");