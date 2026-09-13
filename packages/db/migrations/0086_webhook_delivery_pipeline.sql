CREATE TABLE "webhook_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"delivery_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status_code" integer,
	"error" text,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"event_id" text NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"attempt_limit" integer DEFAULT 8 NOT NULL,
	"lease_token" text,
	"lease_expires_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_delivery_status" CHECK ("webhook_deliveries"."status" in ('pending', 'sending', 'retrying', 'succeeded', 'failed', 'cancelled')),
	CONSTRAINT "webhook_delivery_attempt_count" CHECK ("webhook_deliveries"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"url" text NOT NULL,
	"events" text[] NOT NULL,
	"secret" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"source_key" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatch_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_attempts_delivery_number" ON "webhook_attempts" USING btree ("delivery_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_event_endpoint" ON "webhook_deliveries" USING btree ("event_id","endpoint_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_due" ON "webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_org_created" ON "webhook_deliveries" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_endpoints_org_id" ON "webhook_endpoints" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_org_source" ON "webhook_events" USING btree ("organization_id","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_org_id" ON "webhook_events" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "webhook_events_dispatch" ON "webhook_events" USING btree ("dispatch_at");--> statement-breakpoint
ALTER TABLE "webhook_attempts" ADD CONSTRAINT "webhook_attempts_delivery_id_webhook_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."webhook_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_organization_id_endpoint_id_webhook_endpoints_organization_id_id_fk" FOREIGN KEY ("organization_id","endpoint_id") REFERENCES "public"."webhook_endpoints"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_organization_id_event_id_webhook_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."webhook_events"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;