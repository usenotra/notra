import { db } from "@notra/db/drizzle";
import { geoShelfSources } from "@notra/db/schema";
import { geoShelfSourceSchema } from "@notra/schemas/dashboard/geo-shelf";
import { and, asc, desc, eq, inArray, type SQL, sql } from "drizzle-orm";

import { GEO_SHELF_CITATION_INSERT_CHUNK } from "@/constants/geo-shelf";

import type {
  GeoShelfCitationState,
  GeoShelfCitationSummary,
  GeoShelfPageQuery,
  GeoShelfSearchQuery,
  GeoShelfSource,
  GeoShelfSourcePage,
  GeoShelfStoreKey,
} from "../../types/geo-shelf";

type GeoShelfSourceRow = typeof geoShelfSources.$inferSelect;

/** `db` or an open transaction, so a citation sync can hold its project lock. */
export type GeoShelfDbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

function toSource(row: GeoShelfSourceRow): GeoShelfSource {
  return geoShelfSourceSchema.parse({
    id: row.id,
    url: row.url,
    domain: row.domain,
    title: row.title,
    kind: row.kind,
    ownership: row.ownership,
    origin: row.origin,
    fetchStatus: row.fetchStatus,
    lastFetchedAt: row.lastFetchedAt?.toISOString() ?? null,
    citations: row.citations,
    placements: row.placements,
    opportunity: row.opportunity,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function toRow(source: GeoShelfSource, key: GeoShelfStoreKey) {
  return {
    id: source.id,
    organizationId: key.organizationId,
    projectId: key.projectId,
    url: source.url,
    domain: source.domain,
    title: source.title,
    kind: source.kind,
    ownership: source.ownership,
    origin: source.origin,
    fetchStatus: source.fetchStatus,
    lastFetchedAt: source.lastFetchedAt ? new Date(source.lastFetchedAt) : null,
    citations: source.citations,
    placements: source.placements,
    opportunity: source.opportunity,
    createdByUserId: source.createdByUserId,
    createdAt: new Date(source.createdAt),
    updatedAt: new Date(source.updatedAt),
  };
}

function scopeWhere(key: GeoShelfStoreKey) {
  return and(
    eq(geoShelfSources.organizationId, key.organizationId),
    eq(geoShelfSources.projectId, key.projectId)
  );
}

const placements = geoShelfSources.placements;
const opportunityStatus = sql`${geoShelfSources.opportunity}->>'status'`;
const OPEN_TICKET = sql`${opportunityStatus} in ('open', 'in_progress')`;
const OWN_PRESENT = sql`${placements} @> '[{"competitorId":null,"status":"present"}]'::jsonb`;
const OWN_UNKNOWN = sql`${placements} @> '[{"competitorId":null,"status":"unknown"}]'::jsonb`;
const HAS_OWN_PLACEMENT = sql`jsonb_path_exists(${placements}, '$[*] ? (@.competitorId == null)')`;
const COMPETITOR_PRESENT = sql`jsonb_path_exists(${placements}, '$[*] ? (@.competitorId != null && @.status == "present")')`;

/** SQL twin of `matchesShelfSourceFilter` in `utils/geo-shelf-live-query`. */
function shelfFilterWhere(shelf: GeoShelfPageQuery["shelf"]): SQL | undefined {
  switch (shelf) {
    case "opportunities":
      return sql`(${geoShelfSources.ownership} = 'third_party' and not ${OWN_PRESENT} and ${COMPETITOR_PRESENT})`;
    case "on_shelf":
      return OWN_PRESENT;
    case "unknown":
      return sql`(not ${HAS_OWN_PLACEMENT} or ${OWN_UNKNOWN} or ${geoShelfSources.fetchStatus} in ('blocked', 'pending'))`;
    default:
      return undefined;
  }
}

/** SQL twin of `matchesTicketSourceFilter`. */
function ticketFilterWhere(
  ticket: GeoShelfPageQuery["ticket"],
  currentMemberId: string | null
): SQL | undefined {
  switch (ticket) {
    case "open":
      return sql`${opportunityStatus} = 'open'`;
    case "in_progress":
      return sql`${opportunityStatus} = 'in_progress'`;
    case "mine":
      if (!currentMemberId) {
        return sql`false`;
      }
      // The point of contact falls back to the assignee.
      return sql`(${OPEN_TICKET} and (${geoShelfSources.opportunity}->>'assigneeMemberId' = ${currentMemberId} or coalesce(${geoShelfSources.opportunity}->>'pocMemberId', ${geoShelfSources.opportunity}->>'assigneeMemberId') = ${currentMemberId}))`;
    case "unassigned":
      return sql`(${OPEN_TICKET} and ${geoShelfSources.opportunity}->>'assigneeMemberId' is null)`;
    case "closed":
      return sql`${opportunityStatus} in ('won', 'lost', 'dismissed')`;
    default:
      return undefined;
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function sqlList(values: readonly string[]): SQL {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `
  );
}

/** SQL twin of `matchesSourceSearch`. */
function searchWhere(search: GeoShelfSearchQuery | null): SQL | undefined {
  const text = search?.text.trim() ?? "";
  if (!search || text.length === 0) {
    return undefined;
  }
  const pattern = `%${escapeLikePattern(text)}%`;
  const matches: SQL[] = [
    sql`${geoShelfSources.title} ilike ${pattern}`,
    sql`${geoShelfSources.domain} ilike ${pattern}`,
    sql`${geoShelfSources.url} ilike ${pattern}`,
    sql`${geoShelfSources.opportunity}->>'notes' ilike ${pattern}`,
    sql`exists (select 1 from jsonb_array_elements(${placements}) as placement where placement->>'status' = 'present' and placement->>'brandName' ilike ${pattern})`,
  ];
  if (search.competitorIds.length > 0) {
    matches.push(
      sql`exists (select 1 from jsonb_array_elements(${placements}) as placement where placement->>'status' = 'present' and placement->>'competitorId' in (${sqlList(search.competitorIds)}))`
    );
  }
  if (search.memberIds.length > 0) {
    matches.push(
      sql`${geoShelfSources.opportunity}->>'assigneeMemberId' in (${sqlList(search.memberIds)})`
    );
  }
  return sql`(${sql.join(matches, sql` or `)})`;
}

function pageFilterWhere(query: GeoShelfPageQuery): SQL {
  return (
    and(
      shelfFilterWhere(query.shelf),
      ticketFilterWhere(query.ticket, query.currentMemberId),
      searchWhere(query.search)
    ) ?? sql`true`
  );
}

/** Mirrors the table's client sort values so paging keeps a stable order. */
function sortExpression(key: GeoShelfPageQuery["sort"]["key"]): SQL {
  switch (key) {
    case "title":
      return sql`lower(coalesce(${geoShelfSources.title}, ${geoShelfSources.url}))`;
    case "own":
      return sql`coalesce(jsonb_path_query_first(${placements}, '$[*] ? (@.competitorId == null).status') #>> '{}', 'unknown')`;
    case "ticket":
      return sql`coalesce(${opportunityStatus}, 'zz')`;
    default:
      return sql`coalesce((${geoShelfSources.citations}->>'windowCount')::int, 0)`;
  }
}

interface GeoShelfPageCountsRow {
  total: number;
  filtered: number;
  has_scan: boolean;
  untracked: number;
  open: number;
  in_progress: number;
  won: number;
  lost: number;
  dismissed: number;
}

/**
 * One page of shelf sources plus the counts the page chrome needs, filtered,
 * sorted and sliced in Postgres so the payload stays bounded by `limit`.
 */
export async function queryGeoShelfSourcePage(
  key: GeoShelfStoreKey,
  query: GeoShelfPageQuery
): Promise<Omit<GeoShelfSourcePage, "isSampleData">> {
  const filter = pageFilterWhere(query);
  const order = sortExpression(query.sort.key);
  const [rows, counts] = await Promise.all([
    db
      .select()
      .from(geoShelfSources)
      .where(and(scopeWhere(key), filter))
      .orderBy(
        query.sort.direction === "asc" ? asc(order) : desc(order),
        asc(geoShelfSources.id)
      )
      .limit(query.limit + 1)
      .offset(query.offset),
    db
      .select({
        total: sql<number>`count(*)::int`,
        filtered: sql<number>`count(*) filter (where ${filter})::int`,
        has_scan: sql<boolean>`coalesce(bool_or(${geoShelfSources.origin} = 'scan'), false)`,
        untracked: sql<number>`count(*) filter (where ${filter} and ${opportunityStatus} is null)::int`,
        open: sql<number>`count(*) filter (where ${filter} and ${opportunityStatus} = 'open')::int`,
        in_progress: sql<number>`count(*) filter (where ${filter} and ${opportunityStatus} = 'in_progress')::int`,
        won: sql<number>`count(*) filter (where ${filter} and ${opportunityStatus} = 'won')::int`,
        lost: sql<number>`count(*) filter (where ${filter} and ${opportunityStatus} = 'lost')::int`,
        dismissed: sql<number>`count(*) filter (where ${filter} and ${opportunityStatus} = 'dismissed')::int`,
      })
      .from(geoShelfSources)
      .where(scopeWhere(key)),
  ]);
  const count: GeoShelfPageCountsRow = counts[0] ?? {
    total: 0,
    filtered: 0,
    has_scan: false,
    untracked: 0,
    open: 0,
    in_progress: 0,
    won: 0,
    lost: 0,
    dismissed: 0,
  };
  const hasMore = rows.length > query.limit;
  return {
    sources: rows.slice(0, query.limit).map(toSource),
    nextOffset: hasMore ? query.offset + query.limit : null,
    totalCount: count.total,
    filteredCount: count.filtered,
    boardCounts: {
      untracked: count.untracked,
      open: count.open,
      in_progress: count.in_progress,
      won: count.won,
      lost: count.lost,
      dismissed: count.dismissed,
    },
    hasScanData: count.has_scan,
  };
}

/** Only what the citation sync compares, instead of every full source row. */
export async function listGeoShelfCitationStates(
  key: GeoShelfStoreKey,
  executor: GeoShelfDbExecutor = db
): Promise<GeoShelfCitationState[]> {
  return await executor
    .select({
      id: geoShelfSources.id,
      url: geoShelfSources.url,
      title: geoShelfSources.title,
      citations: geoShelfSources.citations,
    })
    .from(geoShelfSources)
    .where(scopeWhere(key));
}

export async function listPersistedGeoShelfSources(
  key: GeoShelfStoreKey
): Promise<GeoShelfSource[]> {
  const rows = await db
    .select()
    .from(geoShelfSources)
    .where(scopeWhere(key))
    // `id` breaks ties: batched writes share an `updated_at` timestamp.
    .orderBy(desc(geoShelfSources.updatedAt), desc(geoShelfSources.id));
  return rows.map(toSource);
}

export async function findGeoShelfSourceByUrl(
  key: GeoShelfStoreKey,
  seed: () => GeoShelfSource[],
  url: string
): Promise<GeoShelfSource | null> {
  const [row] = await db
    .select()
    .from(geoShelfSources)
    .where(and(scopeWhere(key), eq(geoShelfSources.url, url)))
    .limit(1);
  if (row) {
    return toSource(row);
  }
  return seed().find((candidate) => candidate.url === url) ?? null;
}

export async function insertGeoShelfSource(
  key: GeoShelfStoreKey,
  source: GeoShelfSource
): Promise<GeoShelfSource> {
  const [inserted] = await db
    .insert(geoShelfSources)
    .values(toRow(source, key))
    .returning();
  if (!inserted) {
    throw new Error("Failed to persist GEO shelf source");
  }
  return toSource(inserted);
}

export async function insertGeoShelfSources(
  key: GeoShelfStoreKey,
  sources: GeoShelfSource[],
  executor: GeoShelfDbExecutor = db
): Promise<GeoShelfSource[]> {
  if (sources.length === 0) {
    return [];
  }
  const persisted: GeoShelfSource[] = [];
  for (
    let index = 0;
    index < sources.length;
    index += GEO_SHELF_CITATION_INSERT_CHUNK
  ) {
    const chunk = sources.slice(index, index + GEO_SHELF_CITATION_INSERT_CHUNK);
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential chunks bound database concurrency
    await executor
      .insert(geoShelfSources)
      .values(chunk.map((source) => toRow(source, key)))
      .onConflictDoNothing({
        target: [geoShelfSources.projectId, geoShelfSources.url],
      });
    const rows = await executor
      .select()
      .from(geoShelfSources)
      .where(
        and(
          scopeWhere(key),
          inArray(
            geoShelfSources.url,
            chunk.map((source) => source.url)
          )
        )
      );
    persisted.push(...rows.map(toSource));
  }
  return persisted;
}

export async function updateGeoShelfCitations(
  key: GeoShelfStoreKey,
  updates: {
    id: string;
    citations: GeoShelfCitationSummary;
    title: string | null;
  }[],
  executor?: GeoShelfDbExecutor
): Promise<void> {
  if (updates.length === 0) {
    return;
  }
  if (!executor) {
    await db.transaction((tx) => updateGeoShelfCitations(key, updates, tx));
    return;
  }
  // One statement per chunk instead of one UPDATE per changed source. Chunking
  // keeps us under Postgres's bind-parameter limit (~21k rows at 3 params each).
  for (
    let index = 0;
    index < updates.length;
    index += GEO_SHELF_CITATION_INSERT_CHUNK
  ) {
    const chunk = updates.slice(index, index + GEO_SHELF_CITATION_INSERT_CHUNK);
    const values = sql.join(
      chunk.map(
        (update) =>
          sql`(${update.id}::text, ${JSON.stringify(update.citations)}::jsonb, ${update.title}::text)`
      ),
      sql`, `
    );
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- one transaction connection executes queries serially
    await executor.execute(sql`
      update ${geoShelfSources} as target
      set citations = incoming.citations,
        title = coalesce(target.title, incoming.title),
        updated_at = now() at time zone 'utc'
      from (values ${values}) as incoming(id, citations, title)
      where target.id = incoming.id
        and target.organization_id = ${key.organizationId}
        and target.project_id = ${key.projectId}
    `);
  }
}

export async function patchGeoShelfSource(
  key: GeoShelfStoreKey,
  seed: () => GeoShelfSource[],
  sourceId: string,
  update: (current: GeoShelfSource) => GeoShelfSource
): Promise<GeoShelfSource | null> {
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(geoShelfSources)
      .where(and(scopeWhere(key), eq(geoShelfSources.id, sourceId)))
      .limit(1)
      .for("update");
    const current = row
      ? toSource(row)
      : (seed().find((candidate) => candidate.id === sourceId) ?? null);
    if (!current) {
      return null;
    }

    const next = geoShelfSourceSchema.parse(update(current));
    if (!row) {
      const [inserted] = await tx
        .insert(geoShelfSources)
        .values(toRow(next, key))
        .returning();
      return inserted ? toSource(inserted) : null;
    }

    const [updated] = await tx
      .update(geoShelfSources)
      .set(toRow(next, key))
      .where(and(scopeWhere(key), eq(geoShelfSources.id, sourceId)))
      .returning();
    return updated ? toSource(updated) : null;
  });
}
