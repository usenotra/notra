import { Effect } from "effect";

import {
  GEO_CODING_AGENT_ENGINE_IDS,
  GEO_CURSOR_ENGINE_ID,
  GEO_OPENCODE_ENGINE_ID,
} from "../constants/geo";
import {
  GEO_MODEL_FEED_REVALIDATE_SECONDS,
  GEO_MODEL_FEED_URL,
} from "../constants/geo-model-catalog";
import { GeoFeatureFlagService } from "../deps";
import { geoModelFeedSchema } from "../schemas/geo-model-feed";
import type { GeoModelCatalog, GeoResolvedModelCatalog } from "../types/geo";
import { resolveGroundedEngines } from "../utils/geo-grounded-engines";
import {
  buildGeoModelCatalogFromFeed,
  seedGeoModelCatalog,
  withoutGeoModelCatalogEntries,
} from "../utils/geo-model-catalog";

const MS_PER_SECOND = 1000;

/**
 * `next.revalidate` is honoured by the Next.js fetch cache and ignored by any
 * other runtime, so the same request works inside and outside the dashboard.
 */
interface NextRevalidateRequestInit extends RequestInit {
  next?: { revalidate?: number };
}

let cached: { catalog: GeoModelCatalog; expiresAt: number } | null = null;

async function fetchGeoModelCatalog(): Promise<GeoModelCatalog> {
  const init: NextRevalidateRequestInit = {
    next: { revalidate: GEO_MODEL_FEED_REVALIDATE_SECONDS },
  };
  const response = await fetch(GEO_MODEL_FEED_URL, init);
  if (!response.ok) {
    throw new Error(`Model feed responded with ${response.status}`);
  }
  const feed = geoModelFeedSchema.parse(await response.json());
  const catalog = buildGeoModelCatalogFromFeed(feed.data);
  if (catalog.models.length === 0) {
    throw new Error("Model feed returned no eligible models");
  }
  return catalog;
}

async function loadSharedGeoModelCatalog(): Promise<GeoModelCatalog> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.catalog;
  }
  try {
    const catalog = await fetchGeoModelCatalog();
    cached = {
      catalog,
      expiresAt: Date.now() + GEO_MODEL_FEED_REVALIDATE_SECONDS * MS_PER_SECOND,
    };
    return catalog;
  } catch (error) {
    console.error("[geo] model feed unavailable, using seed catalog", error);
    return cached?.catalog ?? seedGeoModelCatalog();
  }
}

/**
 * The shared catalog narrowed to what one organization may see. Direct
 * engines are flag-gated per organization on top of their credential checks.
 * OpenCode, Claude Code, and Codex share `geo-opencode`.
 */
export const loadGeoModelCatalog = Effect.fn("geo.modelCatalog")(function* (
  organizationId: string
) {
  const featureFlags = yield* GeoFeatureFlagService;
  const [catalog, cursorEnabled, openCodeEnabled] = yield* Effect.all([
    Effect.promise(loadSharedGeoModelCatalog),
    featureFlags.isCursorEngineEnabledForOrganization(organizationId),
    featureFlags.isOpenCodeEngineEnabledForOrganization(organizationId),
  ]);
  const available = withoutGeoModelCatalogEntries(catalog, [
    ...(cursorEnabled ? [] : [GEO_CURSOR_ENGINE_ID]),
    ...(openCodeEnabled
      ? []
      : [GEO_OPENCODE_ENGINE_ID, ...GEO_CODING_AGENT_ENGINE_IDS]),
  ]);
  return {
    ...available,
    models: available.models.map((model) => ({
      ...model,
      supportsGroundedChecks:
        resolveGroundedEngines([model.id], available).length > 0,
    })),
  } satisfies GeoResolvedModelCatalog;
});
