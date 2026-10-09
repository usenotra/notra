ALTER TABLE "sites" ADD COLUMN "smart_deployments" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD COLUMN "input_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD COLUMN "skip_reason" text;
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD COLUMN "smart_deployment_evaluation" jsonb;
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD COLUMN "build_budget_reserved" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_deployments" DROP CONSTRAINT "siteDeployments_status_check";
--> statement-breakpoint
ALTER TABLE "site_deployments" ADD CONSTRAINT "siteDeployments_status_check" CHECK ("status" IN ('queued', 'building', 'uploading', 'ready', 'superseded', 'skipped', 'failed', 'canceled', 'expired'));
