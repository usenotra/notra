import { db } from "@notra/db/drizzle";
import { brandSettings, projects } from "@notra/db/schema";
import { GEO_SAMPLE_DATA_ENABLED } from "@notra/geo-core/constants/geo";
import {
  loadGeoCompetitors,
  loadGeoSettings,
} from "@notra/geo-core/geo/programs";
import type { GeoScopeInput } from "@notra/geo-core/types/geo";
import {
  geoShelfCitationSummarySchema,
  geoShelfSourceSchema,
} from "@notra/schemas/dashboard/geo-shelf";
import {
  canonicalizeShelfUrl,
  shelfDomainFromUrl,
  tryCanonicalizeShelfUrl,
} from "@notra/schemas/utils/dashboard/shelf-url";
import { eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { after } from "next/server";

import {
  GEO_SHELF_DUPLICATE_URL_MESSAGE,
  GEO_SHELF_OPEN_STATUSES,
} from "@/constants/geo-shelf";
import { isUniqueConstraintError } from "@/lib/db/errors";
import { queryCitedShelfPages } from "@/lib/geo-shelf/citation-query";
import { citationsEqual, emptyShelfCitations } from "@/lib/geo-shelf/citations";
import {
  shelfKindFromDomain,
  shelfOwnershipFromDomain,
} from "@/lib/geo-shelf/classify";
import { buildGeoShelfFixture } from "@/lib/geo-shelf/fixtures";
import { assertGeoShelfOpportunityMembers } from "@/lib/geo-shelf/members";
import {
  type GeoShelfDbExecutor,
  insertGeoShelfSource,
  insertGeoShelfSources,
  listGeoShelfCitationStates,
  listGeoShelfSourceUrls,
  listPersistedGeoShelfSources,
  patchGeoShelfSource,
  queryGeoShelfSourcePage,
  updateGeoShelfCitations,
} from "@/lib/geo-shelf/store";
import { geoCoreDashboardLayer } from "@/lib/geo/configure";
import { conflict } from "@/lib/orpc/utils/errors";
import { getWebsiteDomain } from "@/utils/brand";
import {
  compareGeoShelfSources,
  countGeoShelfBoardColumns,
  matchesGeoShelfSourceFilters,
} from "@/utils/geo-shelf-live-query";

import type {
  GeoShelfCitationState,
  GeoShelfCitedPage,
  GeoShelfCreateInput,
  GeoShelfMember,
  GeoShelfOpportunity,
  GeoShelfOpportunityWrite,
  GeoShelfPageQuery,
  GeoShelfPlacement,
  GeoShelfPlacementWrite,
  GeoShelfSearchQuery,
  GeoShelfSource,
  GeoShelfSourcePage,
  GeoShelfStoreKey,
  GeoShelfStoreSeed,
  GeoShelfUpdateInput,
  GeoShelfUpdateResult,
} from "../../types/geo-shelf";

interface GeoShelfBrand {
  competitorId: string | null;
  name: string;
  domain: string | null;
}

async function findProjectDomain(projectId: string): Promise<string | null> {
  const [row] = await db
    .select({ websiteUrl: brandSettings.websiteUrl })
    .from(projects)
    .innerJoin(brandSettings, eq(projects.brandSettingsId, brandSettings.id))
    .where(eq(projects.id, projectId))
    .limit(1);
  return getWebsiteDomain(row?.websiteUrl ?? null);
}

export const loadGeoShelfContext = Effect.fn("geo.shelf.context")(function* (
  input: GeoScopeInput
) {
  const [settingsResponse, competitorsResponse] = yield* Effect.all([
    loadGeoSettings(input),
    loadGeoCompetitors(input),
  ]);
  const settings = settingsResponse.settings;
  const ownDomain = settings
    ? yield* Effect.promise(() => findProjectDomain(settings.projectId))
    : null;
  return {
    settings,
    competitors: competitorsResponse.competitors,
    ownDomain,
  };
});

function storeKey(seed: GeoShelfStoreSeed): GeoShelfStoreKey {
  return {
    organizationId: seed.settings.organizationId,
    projectId: seed.settings.projectId,
  };
}

/** Fixture rows are demo content: never seed them outside sample data mode. */
function seedFixture(seed: GeoShelfStoreSeed) {
  return () => {
    if (!GEO_SAMPLE_DATA_ENABLED) {
      return [];
    }
    return buildGeoShelfFixture(
      {
        ownBrandName: seed.settings.companyName,
        ownDomain: seed.ownDomain,
        competitors: seed.competitors,
        engines: seed.settings.engines,
        members: seed.members,
        now: new Date(),
      },
      storeKey(seed)
    );
  };
}

function buildScanShelfSource(
  seed: GeoShelfStoreSeed,
  page: GeoShelfCitedPage,
  nowIso: string
): GeoShelfSource {
  const firstCitedAt = page.citations.firstCitedAt ?? nowIso;
  const lastCitedAt = page.citations.lastCitedAt ?? nowIso;
  return geoShelfSourceSchema.parse({
    id: crypto.randomUUID(),
    url: page.url,
    domain: page.domain,
    title: page.title,
    kind: shelfKindFromDomain(page.domain),
    ownership: shelfOwnershipFromDomain(
      page.domain,
      seed.ownDomain,
      seed.competitors.map((competitor) => competitor.domain)
    ),
    origin: "scan",
    fetchStatus: "pending",
    lastFetchedAt: null,
    citations: page.citations,
    placements: buildPlacements(seed, [], nowIso, "fetch"),
    opportunity: null,
    createdByUserId: null,
    createdAt: firstCitedAt,
    updatedAt: lastCitedAt,
  } satisfies GeoShelfSource);
}

/**
 * Shelf space is cited scan pages plus anything added by hand. The cited pages
 * are folded in from the whole mention-check history, which is too expensive
 * for every page view, so this runs when a scan or conversation run finishes.
 * Returns how many shelf sources it inserted or updated, so a caller that
 * already read the page knows when to read it again.
 */
async function syncGeoShelfCitations(seed: GeoShelfStoreSeed): Promise<number> {
  const key = storeKey(seed);
  // A scan and a conversation run can finish together. Holding a per-project
  // lock for read and write keeps an older snapshot from landing last.
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`geo-shelf-sync:${key.projectId}`}, 0))`
    );
    const cited = await queryCitedShelfPages(key, tx);
    if (cited.length === 0) {
      return 0;
    }
    const stored = await listGeoShelfCitationStates(key, tx);
    return await writeCitedShelfPages(seed, cited, stored, tx);
  });
}

async function writeCitedShelfPages(
  seed: GeoShelfStoreSeed,
  cited: GeoShelfCitedPage[],
  stored: GeoShelfCitationState[],
  executor: GeoShelfDbExecutor
): Promise<number> {
  const key = storeKey(seed);

  const nowIso = new Date().toISOString();
  const storedByUrl = new Map(stored.map((state) => [state.url, state]));
  const toInsert: GeoShelfSource[] = [];
  const citationUpdates: {
    id: string;
    citations: GeoShelfCitedPage["citations"];
    title: string | null;
  }[] = [];

  for (const page of cited) {
    const existing = storedByUrl.get(page.url);
    if (!existing) {
      toInsert.push(buildScanShelfSource(seed, page, nowIso));
      continue;
    }
    const title = existing.title ?? page.title;
    const storedCitations = geoShelfCitationSummarySchema.safeParse(
      existing.citations
    );
    const citationsChanged =
      !storedCitations.success ||
      !citationsEqual(storedCitations.data, page.citations);
    if (citationsChanged || title !== existing.title) {
      citationUpdates.push({
        id: existing.id,
        citations: page.citations,
        title,
      });
    }
  }

  const inserted = await insertGeoShelfSources(key, toInsert, executor);
  await updateGeoShelfCitations(key, citationUpdates, executor);
  return inserted.length + citationUpdates.length;
}

/** Runs after the response, so a failed refresh never fails the run itself. */
export function scheduleGeoShelfCitationSync(scope: GeoScopeInput): void {
  const target = {
    organizationId: scope.organizationId,
    projectId: scope.projectId,
  };
  after(async () => {
    try {
      await syncGeoShelfCitationsForScope(target);
    } catch (error) {
      console.error("Could not refresh GEO shelf citations", {
        ...target,
        error,
      });
    }
  });
}

/**
 * Rows stored before URLs were canonicalized keep their raw URL, so both sides
 * are canonicalized instead of matching the column exactly.
 */
export async function isGeoShelfUrlOnShelf(
  seed: GeoShelfStoreSeed,
  url: string
): Promise<boolean> {
  const canonical = canonicalizeShelfUrl(url);
  const storedUrls = await listGeoShelfSourceUrls(storeKey(seed));
  const fixtureUrls = seedFixture(seed)().map((source) => source.url);
  return [...storedUrls, ...fixtureUrls].some(
    (stored) => (tryCanonicalizeShelfUrl(stored) ?? stored) === canonical
  );
}

/** Entry point for background jobs that only know the project scope. */
export async function syncGeoShelfCitationsForScope(
  scope: GeoScopeInput
): Promise<number> {
  const context = await Effect.runPromise(
    loadGeoShelfContext(scope).pipe(Effect.provide(geoCoreDashboardLayer))
  );
  if (!context.settings) {
    return 0;
  }
  return await syncGeoShelfCitations({
    ...context,
    settings: context.settings,
    members: [],
  });
}

/**
 * Member and competitor names are not stored on the shelf rows, so a search
 * for them is resolved to ids before it reaches the page query.
 */
export function resolveGeoShelfSearch(
  text: string,
  members: readonly GeoShelfMember[],
  competitors: readonly GeoShelfStoreSeed["competitors"][number][]
): GeoShelfSearchQuery | null {
  const query = text.trim().toLowerCase();
  if (query.length === 0) {
    return null;
  }
  return {
    text: query,
    competitorIds: competitors
      .filter((competitor) => competitor.name.toLowerCase().includes(query))
      .map((competitor) => competitor.id),
    memberIds: members
      .filter((member) => member.name.toLowerCase().includes(query))
      .map((member) => member.id),
  };
}

/** Sample data only exists in development, so paging it in memory is fine. */
function pageSampleGeoShelfSources(
  seed: GeoShelfStoreSeed,
  sources: GeoShelfSource[],
  query: GeoShelfPageQuery
): GeoShelfSourcePage {
  const filters = {
    search: query.search?.text ?? "",
    shelf: query.shelf,
    ticket: query.ticket,
    currentMemberId: query.currentMemberId,
  };
  const matching = sources
    .filter((source) =>
      matchesGeoShelfSourceFilters(
        source,
        filters,
        seed.members,
        seed.competitors
      )
    )
    .sort((left, right) => compareGeoShelfSources(left, right, query.sort));
  const end = query.offset + query.limit;
  return {
    sources: matching.slice(query.offset, end),
    nextOffset: end < matching.length ? end : null,
    totalCount: sources.length,
    filteredCount: matching.length,
    boardCounts: countGeoShelfBoardColumns(matching),
    hasScanData: hasGeoShelfScanData(sources),
    isSampleData: true,
  };
}

export async function listGeoShelfSourcePage(
  seed: GeoShelfStoreSeed,
  query: GeoShelfPageQuery
): Promise<GeoShelfSourcePage> {
  const key = storeKey(seed);
  const fixtures = seedFixture(seed)();
  if (fixtures.length > 0) {
    let persisted = await listPersistedGeoShelfSources(key);
    if (
      !hasGeoShelfScanData(persisted) &&
      (await syncGeoShelfCitations(seed)) > 0
    ) {
      persisted = await listPersistedGeoShelfSources(key);
    }
    const sourceByUrl = new Map(fixtures.map((source) => [source.url, source]));
    for (const source of persisted) {
      sourceByUrl.set(source.url, source);
    }
    return pageSampleGeoShelfSources(seed, [...sourceByUrl.values()], query);
  }

  const page = await queryGeoShelfSourcePage(key, query);
  // A project whose last scan predates the post-scan sync has no scan rows
  // yet, even when someone already added a shelf by hand.
  if (
    page.hasScanData ||
    query.offset > 0 ||
    (await syncGeoShelfCitations(seed)) === 0
  ) {
    return { ...page, isSampleData: false };
  }
  return {
    ...(await queryGeoShelfSourcePage(key, query)),
    isSampleData: false,
  };
}

function isClosedStatus(status: GeoShelfOpportunityWrite["status"]): boolean {
  return !GEO_SHELF_OPEN_STATUSES.includes(status);
}

function normalizeTitle(title: string | null | undefined): string | null {
  const trimmed = title?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function buildOpportunity(
  write: GeoShelfOpportunityWrite,
  userId: string,
  nowIso: string,
  existing: GeoShelfOpportunity | null
): GeoShelfOpportunity {
  const resolvedAt = isClosedStatus(write.status)
    ? (existing?.resolvedAt ?? nowIso)
    : null;
  // The point of contact defaults to the assignee, so storing the same person
  // twice would only create a second id to keep in sync.
  const pocMemberId =
    write.pocMemberId === write.assigneeMemberId ? null : write.pocMemberId;
  return {
    id: existing?.id ?? crypto.randomUUID(),
    ...write,
    pocMemberId,
    createdByUserId: existing?.createdByUserId ?? userId,
    resolvedAt,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
}

function shelfBrands(seed: GeoShelfStoreSeed): GeoShelfBrand[] {
  return [
    {
      competitorId: null,
      name: seed.settings.companyName,
      domain: seed.ownDomain,
    },
    ...seed.competitors.map((competitor) => ({
      competitorId: competitor.id,
      name: competitor.name,
      domain: competitor.domain,
    })),
  ];
}

function placementKey(competitorId: string | null): string {
  return competitorId ?? "";
}

function toPlacement(
  brand: GeoShelfBrand,
  status: GeoShelfPlacement["status"],
  nowIso: string,
  previous: GeoShelfPlacement | undefined,
  evidence: GeoShelfPlacement["evidence"]
): GeoShelfPlacement {
  const isPresent = status === "present";
  return {
    competitorId: brand.competitorId,
    brandName: brand.name,
    brandDomain: brand.domain,
    status,
    position: isPresent ? (previous?.position ?? null) : null,
    hasLink: isPresent ? (previous?.hasLink ?? false) : false,
    evidence,
    excerpt: previous?.excerpt ?? null,
    checkedAt: nowIso,
  };
}

function buildPlacements(
  seed: GeoShelfStoreSeed,
  writes: GeoShelfPlacementWrite[],
  nowIso: string,
  evidence: GeoShelfPlacement["evidence"] = "manual"
): GeoShelfPlacement[] {
  const statusByBrand = new Map(
    writes.map((write) => [placementKey(write.competitorId), write.status])
  );
  return shelfBrands(seed).map((brand) =>
    toPlacement(
      brand,
      statusByBrand.get(placementKey(brand.competitorId)) ?? "unknown",
      nowIso,
      undefined,
      evidence
    )
  );
}

/**
 * Only the brands named in `writes` whose status really changed are rewritten.
 * Everything else keeps its fetch evidence, position and check timestamp.
 */
function mergePlacements(
  seed: GeoShelfStoreSeed,
  existing: GeoShelfPlacement[],
  writes: GeoShelfPlacementWrite[],
  nowIso: string
): GeoShelfPlacement[] {
  if (writes.length === 0) {
    return existing;
  }
  const brandByKey = new Map(
    shelfBrands(seed).map((brand) => [placementKey(brand.competitorId), brand])
  );
  const next = [...existing];
  let changed = false;
  for (const write of writes) {
    const key = placementKey(write.competitorId);
    const index = next.findIndex(
      (placement) => placementKey(placement.competitorId) === key
    );
    const previous = next[index];
    if (previous?.status === write.status) {
      continue;
    }
    const brand =
      brandByKey.get(key) ??
      (previous && {
        competitorId: previous.competitorId,
        name: previous.brandName,
        domain: previous.brandDomain,
      });
    if (!brand) {
      continue;
    }
    const placement = toPlacement(
      brand,
      write.status,
      nowIso,
      previous,
      "manual"
    );
    changed = true;
    if (index < 0) {
      next.push(placement);
      continue;
    }
    next[index] = placement;
  }
  return changed ? next : existing;
}

export async function createGeoShelfSource(
  seed: GeoShelfStoreSeed,
  input: GeoShelfCreateInput,
  userId: string
): Promise<GeoShelfSource> {
  assertGeoShelfOpportunityMembers(seed.members, input.opportunity, null);
  const nowIso = new Date().toISOString();
  const url = canonicalizeShelfUrl(input.url);
  const key = storeKey(seed);
  if (await isGeoShelfUrlOnShelf(seed, url)) {
    throw conflict(GEO_SHELF_DUPLICATE_URL_MESSAGE);
  }
  // Validate before touching the store: a rejected record must not end up in
  // the shelf list of the organization.
  const source = geoShelfSourceSchema.parse({
    id: crypto.randomUUID(),
    url,
    domain: shelfDomainFromUrl(url),
    title: normalizeTitle(input.title),
    kind: input.kind,
    ownership: "third_party",
    origin: "manual",
    fetchStatus: "pending",
    lastFetchedAt: null,
    citations: emptyShelfCitations(),
    placements: buildPlacements(seed, input.placements, nowIso),
    opportunity: input.opportunity
      ? buildOpportunity(input.opportunity, userId, nowIso, null)
      : null,
    createdByUserId: userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  } satisfies GeoShelfSource);
  try {
    return await insertGeoShelfSource(key, source);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw conflict(GEO_SHELF_DUPLICATE_URL_MESSAGE);
    }
    throw error;
  }
}

export async function updateGeoShelfSource(
  seed: GeoShelfStoreSeed,
  input: GeoShelfUpdateInput,
  userId: string
): Promise<GeoShelfUpdateResult | null> {
  const nowIso = new Date().toISOString();
  const resolveOpportunity = (
    current: GeoShelfOpportunity | null
  ): GeoShelfOpportunity | null => {
    if (input.opportunity === undefined) {
      return current;
    }
    if (input.opportunity === null) {
      return null;
    }
    const write = {
      status: current?.status ?? "open",
      priority: current?.priority ?? null,
      assigneeMemberId: current?.assigneeMemberId ?? null,
      pocMemberId: current?.pocMemberId ?? null,
      notes: current?.notes ?? null,
      dueAt: current?.dueAt ?? null,
      ...input.opportunity,
    } satisfies GeoShelfOpportunityWrite;
    assertGeoShelfOpportunityMembers(seed.members, input.opportunity, current);
    return buildOpportunity(write, userId, nowIso, current);
  };
  let assigneeChanged = false;
  let placementsChanged = false;
  const source = await patchGeoShelfSource(
    storeKey(seed),
    seedFixture(seed),
    input.sourceId,
    (current) => {
      const opportunity = resolveOpportunity(current.opportunity);
      const placements = input.placements
        ? mergePlacements(seed, current.placements, input.placements, nowIso)
        : current.placements;
      assigneeChanged =
        (opportunity?.assigneeMemberId ?? null) !==
        (current.opportunity?.assigneeMemberId ?? null);
      placementsChanged = placements !== current.placements;
      return geoShelfSourceSchema.parse({
        ...current,
        title:
          input.title === undefined
            ? current.title
            : normalizeTitle(input.title),
        kind: input.kind ?? current.kind,
        placements,
        opportunity,
        updatedAt: nowIso,
      } satisfies GeoShelfSource);
    }
  );
  if (!source) {
    return null;
  }
  return { source, assigneeChanged, placementsChanged };
}

function hasGeoShelfScanData(sources: GeoShelfSource[]): boolean {
  return sources.some((source) => source.origin === "scan");
}
