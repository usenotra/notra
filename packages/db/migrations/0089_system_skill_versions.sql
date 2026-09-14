CREATE TABLE "system_skill_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"changelog" text,
	"published_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "system_skill_version_id" text;--> statement-breakpoint
CREATE INDEX "system_skill_versions_name_idx" ON "system_skill_versions" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "system_skill_versions_name_version_uidx" ON "system_skill_versions" USING btree ("name","version");--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_system_skill_version_id_system_skill_versions_id_fk" FOREIGN KEY ("system_skill_version_id") REFERENCES "public"."system_skill_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skills_system_skill_version_id_idx" ON "skills" USING btree ("system_skill_version_id");