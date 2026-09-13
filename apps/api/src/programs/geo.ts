import { db } from "@notra/db/drizzle";
import { geoScans } from "@notra/db/schema";
import {
  loadAgentReadiness,
  startAgentReadinessScan,
} from "@notra/geo-core/geo/agent-readiness";
import { geoDb } from "@notra/geo-core/geo/effect";
import { loadGeoModelCatalog } from "@notra/geo-core/geo/model-catalog";
import { upsertGeoSettings } from "@notra/geo-core/geo/programs";
import { requireGeoProject } from "@notra/geo-core/geo/projects";
import type { GeoSettingsUpsertInput } from "@notra/geo-core/types/geo";
import {
  isSupportedGeoLanguage,
  SUPPORTED_GEO_LANGUAGES,
} from "@notra/geo-core/utils/geo-language-rows";
import { and, count, desc, eq } from "drizzle-orm";
import { Effect } from "effect";

import { GeoScanNotFoundError, GeoSelectionInvalidError } from "../errors/geo";

export interface ValidateGeoSelectionInput {
  readonly organizationId: string;
  readonly engines: readonly string[];
  readonly languages: readonly string[];
}

function unknownEntries(
  values: readonly string[],
  isKnown: (value: string) => boolean
): string[] {
  return [...new Set(values.filter((value) => !isKnown(value)))];
}

function geoSelectionErrorMessage(
  catalogIds: readonly string[],
  engines: readonly string[],
  languages: readonly string[]
): string | null {
  const knownEngines = new Set(catalogIds);

  const rejectedEngines = unknownEntries(engines, (engine) =>
    knownEngines.has(engine)
  );
  if (rejectedEngines.length > 0) {
    return `Unknown engines: ${rejectedEngines.join(", ")}. Supported engines: ${catalogIds.join(", ")}`;
  }

  const rejectedLanguages = unknownEntries(languages, isSupportedGeoLanguage);
  if (rejectedLanguages.length > 0) {
    return `Unknown languages: ${rejectedLanguages.join(", ")}. Supported languages: ${SUPPORTED_GEO_LANGUAGES.join(", ")}`;
  }

  return null;
}

/**
 * Rejects engine ids and languages the storage layer would silently rewrite.
 *
 * `resolveTrackedEngines` drops ids that are not in the catalog and falls back
 * to the *full* default engine set once nothing known is left, so a single
 * typo could turn a one-engine scan into a five-engine one. `trackedGeoLanguages`
 * coerces an unknown language to English the same way. Both used to answer 200,
 * so the caller never learned its selection had been replaced.
 *
 * Engines are checked against the catalog this organization can see. That is
 * the same set `GET .../geo/settings` reports (it maps stored engines through
 * `resolveTrackedEngines`), so a read-modify-write round trip always passes.
 * Engines that are stored but currently hidden from the organization are
 * preserved by `upsertGeoSettings` itself and are deliberately not required in
 * the payload. `nonZdrApprovedEngines` is *not* validated here: the GET
 * response returns it straight from the row, hidden ids included, so rejecting
 * them would break that same round trip.
 */
export const validateGeoSelection = Effect.fn("geo.validateSelection")(
  function* (input: ValidateGeoSelectionInput) {
    const catalog = yield* loadGeoModelCatalog(input.organizationId);
    const catalogIds = catalog.models.map((model) => model.id);
    const message = geoSelectionErrorMessage(
      catalogIds,
      input.engines,
      input.languages
    );
    if (message) {
      return yield* Effect.fail(new GeoSelectionInvalidError({ message }));
    }
  }
);

export const upsertGeoSettingsWithValidation = Effect.fn(
  "geo.settingsUpsertWithValidation"
)(function* (input: GeoSettingsUpsertInput) {
  yield* validateGeoSelection({
    organizationId: input.organizationId,
    engines: input.engines,
    languages: input.languages,
  });
  return yield* upsertGeoSettings(input);
});

export interface GeoProjectScopeInput {
  readonly organizationId: string;
  readonly projectId: string;
}

export const getGeoAgentReadiness = Effect.fn("geo.agentReadiness.get")(
  function* (input: GeoProjectScopeInput) {
    const scope = yield* requireGeoProject(input);
    return yield* loadAgentReadiness(scope);
  }
);

export const startGeoAgentReadinessScanForProject = Effect.fn(
  "geo.agentReadiness.startForProject"
)(function* (input: GeoProjectScopeInput) {
  const scope = yield* requireGeoProject(input);
  return yield* startAgentReadinessScan(scope);
});

export interface ListGeoScansInput extends GeoProjectScopeInput {
  readonly limit: number;
  readonly page: number;
}

interface GeoScanRecord {
  readonly id: string;
  readonly projectId: string;
  readonly status: "running" | "completed" | "failed";
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
  readonly createdAt: Date;
}

function serializeGeoScan(row: GeoScanRecord) {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export const listGeoScansForProject = Effect.fn("geo.scans.list")(function* (
  input: ListGeoScansInput
) {
  const scope = and(
    eq(geoScans.projectId, input.projectId),
    eq(geoScans.organizationId, input.organizationId)
  );

  const [totals, rows] = yield* Effect.all([
    geoDb("list geo scans count", () =>
      db.select({ value: count() }).from(geoScans).where(scope)
    ),
    geoDb("list geo scans", () =>
      db.query.geoScans.findMany({
        where: scope,
        orderBy: [desc(geoScans.startedAt)],
        limit: input.limit,
        offset: (input.page - 1) * input.limit,
      })
    ),
  ]);

  const totalItems = totals.at(0)?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / input.limit));

  return {
    scans: rows.map(serializeGeoScan),
    pagination: {
      limit: input.limit,
      currentPage: input.page,
      nextPage: input.page < totalPages ? input.page + 1 : null,
      previousPage: input.page > 1 ? input.page - 1 : null,
      totalPages,
      totalItems,
    },
  };
});

export interface GetGeoScanInput extends GeoProjectScopeInput {
  readonly scanId: string;
}

export const getGeoScanForProject = Effect.fn("geo.scans.get")(function* (
  input: GetGeoScanInput
) {
  const row = yield* geoDb("get geo scan", () =>
    db.query.geoScans.findFirst({
      where: and(
        eq(geoScans.id, input.scanId),
        eq(geoScans.projectId, input.projectId),
        eq(geoScans.organizationId, input.organizationId)
      ),
    })
  );

  if (!row) {
    return yield* Effect.fail(
      new GeoScanNotFoundError({ scanId: input.scanId })
    );
  }

  return { scan: serializeGeoScan(row) };
});
