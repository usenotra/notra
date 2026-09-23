CREATE TYPE "public"."post_visibility" AS ENUM('private', 'organization', 'unlisted');
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "visibility" "post_visibility" DEFAULT 'organization' NOT NULL;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "share_token" text;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "created_by_user_id" text;
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "posts_shareToken_uidx" ON "posts" USING btree ("share_token") WHERE "posts"."share_token" IS NOT NULL;
