DROP INDEX "geoMentionChecks_project_captured_cover_idx";--> statement-breakpoint
ALTER TABLE "geo_mention_checks" ADD COLUMN "owned_source_cited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
WITH "brand_domains" AS (
	SELECT
		"projects"."id" AS "project_id",
		regexp_replace(
			split_part(
				split_part(
					regexp_replace(lower(trim("brand_settings"."website_url")), '^[a-z][a-z0-9+.-]*://', ''),
					'/',
					1
				),
				':',
				1
			),
			'^www\.',
			''
		) AS "domain"
	FROM "projects"
	INNER JOIN "brand_settings"
		ON "brand_settings"."id" = "projects"."brand_settings_id"
		AND "brand_settings"."organization_id" = "projects"."organization_id"
)
UPDATE "geo_mention_checks" AS "checks"
SET "owned_source_cited" = true
FROM "brand_domains"
WHERE "checks"."project_id" = "brand_domains"."project_id"
	AND "brand_domains"."domain" <> ''
	AND EXISTS (
		SELECT 1
		FROM jsonb_array_elements(
			coalesce("checks"."sources", '[]'::jsonb)
			|| coalesce("checks"."grounding"->'sources', '[]'::jsonb)
		) AS "source"
		CROSS JOIN LATERAL (
			SELECT regexp_replace(
				split_part(
					split_part(
						regexp_replace(lower(trim("source"->>'url')), '^[a-z][a-z0-9+.-]*://', ''),
						'/',
						1
					),
					':',
					1
				),
				'^www\.',
				''
			) AS "domain"
		) AS "source_domain"
		WHERE "source_domain"."domain" = "brand_domains"."domain"
			OR right(
				"source_domain"."domain",
				length("brand_domains"."domain") + 1
			) = '.' || "brand_domains"."domain"
	);--> statement-breakpoint
CREATE INDEX "geoMentionChecks_project_captured_cover_idx" ON "geo_mention_checks" USING btree ("project_id","captured_at","organization_id","language","engine","prompt_id","mentioned","owned_source_cited","position","sentiment","sequence_id");
