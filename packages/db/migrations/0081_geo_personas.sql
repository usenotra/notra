CREATE TABLE "geo_persona_memories" (
	"id" text PRIMARY KEY NOT NULL,
	"persona_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_personas" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"company" text NOT NULL,
	"summary" text NOT NULL,
	"search_style" text NOT NULL,
	"profile" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_mention_checks" ADD COLUMN "persona_id" text;--> statement-breakpoint
ALTER TABLE "geo_persona_memories" ADD CONSTRAINT "geo_persona_memories_persona_id_geo_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."geo_personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_persona_memories" ADD CONSTRAINT "geo_persona_memories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_persona_memories" ADD CONSTRAINT "geo_persona_memories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_personas" ADD CONSTRAINT "geo_personas_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_personas" ADD CONSTRAINT "geo_personas_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "geoPersonaMemories_personaId_idx" ON "geo_persona_memories" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "geoPersonaMemories_projectId_idx" ON "geo_persona_memories" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "geoPersonas_organizationId_idx" ON "geo_personas" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "geoPersonas_projectId_idx" ON "geo_personas" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "geo_mention_checks" ADD CONSTRAINT "geo_mention_checks_persona_id_geo_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."geo_personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "geoMentionChecks_personaId_capturedAt_idx" ON "geo_mention_checks" USING btree ("persona_id","captured_at");