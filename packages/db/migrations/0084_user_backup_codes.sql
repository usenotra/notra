CREATE TABLE "user_backup_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_backup_codes" ADD CONSTRAINT "user_backup_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_backup_codes_userId_idx" ON "user_backup_codes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_backup_codes_userId_codeHash_uidx" ON "user_backup_codes" USING btree ("user_id","code_hash");