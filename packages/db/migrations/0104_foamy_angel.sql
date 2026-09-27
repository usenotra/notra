ALTER TABLE "users" ALTER COLUMN "locale" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "locale" DROP NOT NULL;--> statement-breakpoint
UPDATE "users" SET "locale" = NULL;
