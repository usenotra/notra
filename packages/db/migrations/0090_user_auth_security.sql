CREATE TABLE IF NOT EXISTS "user_backup_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user_backup_codes" ADD CONSTRAINT "user_backup_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_backup_codes_userId_idx" ON "user_backup_codes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_backup_codes_userId_codeHash_uidx" ON "user_backup_codes" USING btree ("user_id","code_hash");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_auth_factor_labels" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"factor_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_auth_factor_labels_factor_id_unique" UNIQUE("factor_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user_auth_factor_labels" ADD CONSTRAINT "user_auth_factor_labels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_auth_factor_labels_userId_idx" ON "user_auth_factor_labels" USING btree ("user_id");
