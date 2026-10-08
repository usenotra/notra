# Analytics identity and rollup migration

The repository definitions include a new AI `site_id` column and corrected
aggregate sorting keys. No remote datasource migration, deployment, rebuild,
or backfill has been applied as part of this change.

## Before deploying readers

1. Add `site_id` with an empty-string default to `geo_traffic_events`. Existing
   rows remain explicitly unassigned; do not infer a historical site from a
   site's current host, mounts, or project.
2. Use Tinybird's supported datasource replacement/migration procedure for the
   changed aggregate keys. `geo_traffic_daily` and
   `geo_traffic_pages_by_host_daily` must preserve `site_id`.
   `web_sources_daily` must preserve `ai_product`, `utm_medium`, and
   `utm_campaign`; `web_audience_daily` must preserve `os`.
3. Rebuild replacement aggregates from raw events using the updated materialized
   view grouping definitions. Coordinate an ingestion pause or a non-overlapping
   historical/live cutoff so each event enters each replacement aggregate once.
   Never append a complete count backfill to a populated aggregate. The existing
   GEO pages backfill uses replace mode, but it is not a migration for all the
   other affected datasources.
4. Verify aggregate counts and separate site/campaign/OS buckets before switching
   readers. Keep the previous deployment available until the new schema, writers,
   materialized views, and readers are compatible.

Raw human page views expire after 90 days, and raw AI requests after 396 days.
Campaign and OS dimensions already collapsed by old merge keys cannot be
recovered from those aggregates alone. Do not erase retained aggregate history
outside the reconstructable raw window; decide its retention and labeling before
replacing the remote datasource.

Site analytics now filter by stable site identity across host and project
changes. Legacy empty-site AI rows still appear in existing GEO project/host
analytics, but are deliberately excluded from a specific site's totals.

New 404 facts retain their page/error counts but have no content-session ID and
do not advance content-session indexes. The updated page rollup also excludes
404s from session and engagement states. Rebuilding old raw facts cannot repair
the session indexes that the previous writer already advanced; do not describe
historical sessions as retroactively corrected.

Local tests check schema metadata, SQLite translations of SQL semantics, and
ingest/session behavior. They do not prove real ClickHouse background-merge
behavior; that requires a separate merge-engine check before remote rollout.
