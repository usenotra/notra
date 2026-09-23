ALTER TABLE "geo_settings" ADD COLUMN "brand_facts" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "brand_settings" ADD COLUMN "knowledge_github_integration_id" text;
ALTER TABLE "brand_settings" ADD COLUMN "knowledge_records" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "brand_settings" ADD COLUMN "knowledge_synced_at" timestamp;
ALTER TABLE "brand_settings" ADD COLUMN "knowledge_sync_error" text;
ALTER TABLE "brand_settings" ADD CONSTRAINT "brand_settings_knowledge_github_integration_id_github_integrations_id_fk" FOREIGN KEY ("knowledge_github_integration_id") REFERENCES "public"."github_integrations"("id") ON DELETE set null ON UPDATE no action;

UPDATE "brand_settings" AS identity
SET "knowledge_records" = source.facts
FROM (
    SELECT DISTINCT ON (project.brand_settings_id)
      project.brand_settings_id,
      (
        SELECT COALESCE(
          jsonb_agg(
            CASE
              WHEN jsonb_typeof(fact) = 'object'
                THEN fact || jsonb_build_object('origin', 'manual', 'pinned', true)
              ELSE fact
            END
          ),
          '[]'::jsonb
        )
        FROM jsonb_array_elements(geo.brand_facts) AS fact
      ) AS facts
    FROM "geo_settings" AS geo
    INNER JOIN "projects" AS project ON project.id = geo.project_id
    WHERE jsonb_typeof(geo.brand_facts) = 'array'
      AND jsonb_array_length(geo.brand_facts) > 0
    ORDER BY project.brand_settings_id, jsonb_array_length(geo.brand_facts) DESC
) AS source
WHERE identity.id = source.brand_settings_id
  AND jsonb_array_length(identity.knowledge_records) = 0;
