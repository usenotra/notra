CREATE TABLE "geo_adhoc_scans" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"input" jsonb NOT NULL,
	"results" jsonb,
	"error_code" text,
	"error_message" text,
	"retryable" boolean,
	"started_at" timestamp,
	"heartbeat_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_adhoc_scans" ADD CONSTRAINT "geo_adhoc_scans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_adhoc_scans" ADD CONSTRAINT "geo_adhoc_scans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "geoAdhocScans_organizationId_idx" ON "geo_adhoc_scans" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "geoAdhocScans_organizationId_idempotencyKey_uidx" ON "geo_adhoc_scans" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "geoAdhocScans_projectId_createdAt_idx" ON "geo_adhoc_scans" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "geoAdhocScans_status_heartbeatAt_idx" ON "geo_adhoc_scans" USING btree ("status","heartbeat_at");