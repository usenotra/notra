UPDATE "posts" SET "visibility" = 'organization' WHERE "visibility" = 'private';
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "visibility" DROP DEFAULT;
--> statement-breakpoint
ALTER TYPE "public"."post_visibility" RENAME TO "post_visibility_old";
--> statement-breakpoint
CREATE TYPE "public"."post_visibility" AS ENUM('organization', 'unlisted');
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "visibility" TYPE "public"."post_visibility" USING "visibility"::text::"public"."post_visibility";
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "visibility" SET DEFAULT 'organization'::"public"."post_visibility";
--> statement-breakpoint
DROP TYPE "public"."post_visibility_old";
