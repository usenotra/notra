import type { GeoScopeInput } from "@notra/geo-core/types/geo";
import { geoShelfSourceSchema } from "@notra/schemas/dashboard/geo-shelf";
import {
  canonicalizeShelfUrl,
  shelfDomainFromUrl,
} from "@notra/schemas/utils/dashboard/shelf-url";

import { GEO_SHELF_OPEN_STATUSES } from "@/constants/geo-shelf";
import { isUniqueConstraintError } from "@/lib/db/errors";
import { afterResponse as after } from "@/lib/framework/after-response";
import { emptyShelfCitations } from "@/lib/geo-shelf/citations";
import { assertGeoShelfOpportunityMembers } from "@/lib/geo-shelf/members";
import {
  buildPlacements,
  isGeoShelfUrlOnShelf,
  mergePlacements,
  seedFixture,
  storeKey,
  syncGeoShelfCitationsForScope,
} from "@/lib/geo-shelf/service";
import {
  insertGeoShelfSource,
  patchGeoShelfSource,
} from "@/lib/geo-shelf/store";
import { getTranslations } from "@/lib/i18n/server";
import { conflict } from "@/lib/orpc/utils/errors";
import type {
  GeoShelfCreateInput,
  GeoShelfOpportunity,
  GeoShelfOpportunityWrite,
  GeoShelfSource,
  GeoShelfStoreSeed,
  GeoShelfUpdateInput,
  GeoShelfUpdateResult,
} from "@/types/geo-shelf";

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
  const resolvedAt = !GEO_SHELF_OPEN_STATUSES.includes(write.status)
    ? (existing?.resolvedAt ?? nowIso)
    : null;
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

export async function createGeoShelfSource(
  seed: GeoShelfStoreSeed,
  input: GeoShelfCreateInput,
  userId: string
): Promise<GeoShelfSource> {
  const t = await getTranslations();
  assertGeoShelfOpportunityMembers(
    seed.members,
    input.opportunity,
    null,
    t("errors.geo.notOrganizationMember")
  );
  const nowIso = new Date().toISOString();
  const url = canonicalizeShelfUrl(input.url);
  const key = storeKey(seed);
  if (await isGeoShelfUrlOnShelf(seed, url)) {
    throw conflict(t("common.messages.thisPageIsAlreadyOn"));
  }
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
      throw conflict(t("common.messages.thisPageIsAlreadyOn"));
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
  const notMemberMessage = (await getTranslations("errors.geo"))(
    "notOrganizationMember"
  );
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
    assertGeoShelfOpportunityMembers(
      seed.members,
      input.opportunity,
      current,
      notMemberMessage
    );
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
