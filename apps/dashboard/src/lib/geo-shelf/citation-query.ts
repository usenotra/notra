import { db } from "@notra/db/drizzle";
import { geoMentionChecks } from "@notra/db/schema";
import { sql } from "drizzle-orm";

import { GEO_SHELF_CITATION_WINDOW_DAYS } from "@/constants/geo-shelf";
import { foldShelfCitationRows } from "@/lib/geo-shelf/citations";

import type {
  GeoShelfCitedPage,
  GeoShelfStoreKey,
} from "../../types/geo-shelf";

interface CitedSourceSqlRow {
  url: string | null;
  title: string | null;
  window_count: number | string | null;
  total_count: number | string | null;
  prompt_ids: string[] | null;
  engines: string[] | null;
  check_ids: string[] | null;
  window_check_ids: string[] | null;
  first_cited_at: Date | string | null;
  last_cited_at: Date | string | null;
}

function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringList(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry) => typeof entry === "string" && entry.length > 0);
}

/**
 * Unique cited pages for a project: one row per mention-check URL, counting
 * a check once even when the same URL is in both `sources` and grounding.
 *
 * The lateral JSONB unnest scans the project's whole mention-check history
 * because `total_count` is shown as "All time". The cost grows linearly with
 * history; materialising a per-source all-time counter in the scan-completion
 * job would let this query be bounded to the citation window.
 */
export async function queryCitedShelfPages(
  key: GeoShelfStoreKey
): Promise<GeoShelfCitedPage[]> {
  const windowFrom = new Date(
    Date.now() - GEO_SHELF_CITATION_WINDOW_DAYS * 86_400_000
  );
  const sourcesJson = sql`case
    when jsonb_typeof(${geoMentionChecks.sources}) = 'array'
    then ${geoMentionChecks.sources}
    else '[]'::jsonb
  end`;
  const groundingJson = sql`case
    when jsonb_typeof(${geoMentionChecks.grounding}->'sources') = 'array'
    then ${geoMentionChecks.grounding}->'sources'
    else '[]'::jsonb
  end`;

  const result = await db.execute(sql`
    with listed as (
      select
        ${geoMentionChecks.id} as check_id,
        ${geoMentionChecks.engine} as engine,
        ${geoMentionChecks.promptId} as prompt_id,
        ${geoMentionChecks.capturedAt} as captured_at,
        listed.src->>'url' as url,
        nullif(listed.src->>'title', '') as title
      from ${geoMentionChecks}
      cross join lateral (
        select value as src from jsonb_array_elements(${sourcesJson})
        union all
        select value as src from jsonb_array_elements(${groundingJson})
      ) listed
      where ${geoMentionChecks.organizationId} = ${key.organizationId}
        and ${geoMentionChecks.projectId} = ${key.projectId}
        and coalesce(listed.src->>'url', '') <> ''
    ),
    unique_check_urls as (
      select distinct on (check_id, url)
        check_id,
        engine,
        prompt_id,
        captured_at,
        url,
        title
      from listed
      order by check_id, url, title nulls last
    )
    select
      url,
      (array_agg(title order by captured_at desc) filter (where title is not null))[1] as title,
      count(*) filter (where captured_at >= ${windowFrom})::int as window_count,
      count(*)::int as total_count,
      array_agg(distinct prompt_id) as prompt_ids,
      array_agg(distinct engine) as engines,
      array_agg(distinct check_id) as check_ids,
      array_agg(distinct check_id) filter (where captured_at >= ${windowFrom}) as window_check_ids,
      min(captured_at) as first_cited_at,
      max(captured_at) as last_cited_at
    from unique_check_urls
    group by url
  `);

  const rows = (result.rows as CitedSourceSqlRow[]).flatMap((row) => {
    if (!row.url || !row.first_cited_at || !row.last_cited_at) {
      return [];
    }
    return [
      {
        url: row.url,
        title: row.title,
        windowCount: toCount(row.window_count),
        totalCount: toCount(row.total_count),
        promptIds: toStringList(row.prompt_ids),
        engines: toStringList(row.engines),
        checkIds: toStringList(row.check_ids),
        windowCheckIds: toStringList(row.window_check_ids),
        firstCitedAt: row.first_cited_at,
        lastCitedAt: row.last_cited_at,
      },
    ];
  });

  return foldShelfCitationRows(rows);
}
