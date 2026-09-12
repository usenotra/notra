import { db } from "@notra/db/drizzle";
import { brandSettings, projects } from "@notra/db/schema";
import { GEO_SAMPLE_DATA_ENABLED } from "@notra/geo-core/constants/geo";
import {
  loadGeoCompetitors,
  loadGeoSettings,
} from "@notra/geo-core/geo/programs";
import type { GeoScopeInput } from "@notra/geo-core/types/geo";
import { geoShelfSourceSchema } from "@notra/schemas/dashboard/geo-shelf";
import {
  canonicalizeShelfUrl,
  shelfDomainFromUrl,
} from "@notra/schemas/utils/dashboard/shelf-url";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

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
  findGeoShelfSourceByUrl,
  insertGeoShelfSource,
  insertGeoShelfSources,
  listPersistedGeoShelfSources,
  patchGeoShelfSource,
  updateGeoShelfCitations,
} from "@/lib/geo-shelf/store";
import { conflict } from "@/lib/orpc/utils/errors";
import { getWebsiteDomain } from "@/utils/brand";

import type {
  GeoShelfCitedPage,
  GeoShelfCreateInput,
  GeoShelfOpportunity,
  GeoShelfOpportunityWrite,
  GeoShelfPlacement,
  GeoShelfPlacementWrite,
  GeoShelfSource,
  GeoShelfSourceList,
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
 * Shelf space is cited scan pages plus anything added by hand. Historical
 * mention-checks are folded in on read so Reddit (and other cited hosts)
 * show up without waiting for the next scan.
 */
async function syncCitedShelfSources(
  seed: GeoShelfStoreSeed,
  persisted: GeoShelfSource[]
): Promise<GeoShelfSource[]> {
  const cited = await queryCitedShelfPages(storeKey(seed));
  if (cited.length === 0) {
    return persisted;
  }

  const nowIso = new Date().toISOString();
  const remaining = new Map(persisted.map((source) => [source.url, source]));
  const next: GeoShelfSource[] = [];
  const toInsert: GeoShelfSource[] = [];
  const citationUpdates: {
    id: string;
    citations: GeoShelfCitedPage["citations"];
    title: string | null;
  }[] = [];

  for (const page of cited) {
    const existing = remaining.get(page.url);
    if (!existing) {
      const source = buildScanShelfSource(seed, page, nowIso);
      toInsert.push(source);
      next.push(source);
      continue;
    }
    remaining.delete(page.url);
    const title = existing.title ?? page.title;
    const citationsChanged = !citationsEqual(
      existing.citations,
      page.citations
    );
    const titleChanged = title !== existing.title;
    if (citationsChanged || titleChanged) {
      citationUpdates.push({
        id: existing.id,
        citations: page.citations,
        title,
      });
    }
    next.push(
      citationsChanged || titleChanged
        ? { ...existing, title, citations: page.citations }
        : existing
    );
  }
  next.push(...remaining.values());

  const [inserted] = await Promise.all([
    insertGeoShelfSources(storeKey(seed), toInsert),
    updateGeoShelfCitations(storeKey(seed), citationUpdates),
  ]);
  if (inserted.length === 0) {
    return next;
  }

  const insertedByUrl = new Map(inserted.map((source) => [source.url, source]));
  return next.map((source) => insertedByUrl.get(source.url) ?? source);
}

export async function listGeoShelfSources(
  seed: GeoShelfStoreSeed
): Promise<GeoShelfSourceList> {
  const key = storeKey(seed);
  const persisted = await listPersistedGeoShelfSources(key);
  const sources = await syncCitedShelfSources(seed, persisted);
  const fixtures = seedFixture(seed)();
  if (fixtures.length === 0) {
    return { sources, isSampleData: false };
  }
  const sourceByUrl = new Map(fixtures.map((source) => [source.url, source]));
  for (const source of sources) {
    sourceByUrl.set(source.url, source);
  }
  return { sources: [...sourceByUrl.values()], isSampleData: true };
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
  const seedSources = seedFixture(seed);
  if (await findGeoShelfSourceByUrl(key, seedSources, url)) {
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

export function hasGeoShelfScanData(sources: GeoShelfSource[]): boolean {
  return sources.some((source) => source.origin === "scan");
}
