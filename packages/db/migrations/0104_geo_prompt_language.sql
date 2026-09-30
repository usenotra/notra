CREATE TABLE "geo_prompt_translations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"prompt_id" text NOT NULL,
	"language" text NOT NULL,
	"text" text,
	"source_text" text,
	"edited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_settings" ADD COLUMN "prompt_language" text;--> statement-breakpoint
ALTER TABLE "geo_prompt_translations" ADD CONSTRAINT "geo_prompt_translations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_prompt_translations" ADD CONSTRAINT "geo_prompt_translations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "geoPromptTranslations_project_prompt_language_idx" ON "geo_prompt_translations" USING btree ("project_id","prompt_id","language");--> statement-breakpoint
CREATE INDEX "geoPromptTranslations_organizationId_idx" ON "geo_prompt_translations" USING btree ("organization_id");