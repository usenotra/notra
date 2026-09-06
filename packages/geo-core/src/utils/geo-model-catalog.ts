import {
  GEO_DEFAULT_ENGINE_IDS,
  GEO_MODEL_CATALOG_SEED,
  GEO_MODEL_CATALOG_STATIC,
  GEO_MODEL_EXCLUDED_ID_PATTERN,
  GEO_MODEL_EXCLUDED_SLUG_PATTERN,
  GEO_MODEL_EXCLUDED_TAGS,
  GEO_MODEL_PROVIDERS,
  GEO_MODELS_PER_PROVIDER,
  GEO_STATIC_ENGINE_ENV,
} from "../constants/geo-model-catalog";
import type {
  GeoGatewayModel,
  GeoModelCatalog,
  GeoModelCatalogEntry,
  GeoModelProviderId,
} from "../types/geo";

const MS_PER_SECOND = 1000;
const DAY_LENGTH = 10;
const DEFAULT_ENGINE_SET = new Set<string>(GEO_DEFAULT_ENGINE_IDS);

function isEligibleFeedModel(model: GeoGatewayModel): boolean {
  if (model.type !== "language" || model.deprecated_at) {
    return false;
  }
  if (
    GEO_MODEL_EXCLUDED_ID_PATTERN.test(model.id) ||
    GEO_MODEL_EXCLUDED_SLUG_PATTERN.test(model.id)
  ) {
    return false;
  }
  return !(model.tags ?? []).some((tag) => GEO_MODEL_EXCLUDED_TAGS.has(tag));
}

function toCatalogEntry(
  model: GeoGatewayModel,
  provider: GeoModelProviderId
): GeoModelCatalogEntry {
  return {
    id: model.id,
    provider,
    label: model.name,
    zdr: model.zdr,
    released: toDayString(model.released),
    default: DEFAULT_ENGINE_SET.has(model.id),
    gateways: ["vercel"],
  };
}

function toDayString(seconds: number | undefined): string {
  if (seconds === undefined) {
    return "";
  }
  return new Date(seconds * MS_PER_SECOND).toISOString().slice(0, DAY_LENGTH);
}

/**
 * True when a static (non-gateway) engine can actually run, i.e. its provider
 * credential is configured. Server-side only — the catalog is built in
 * `lib/geo/model-catalog.ts`. Per-organization exposure (feature flags) is
 * applied on top of this by `withoutGeoModelCatalogEntries`.
 */
function isGeoStaticEngineAvailable(entry: GeoModelCatalogEntry): boolean {
  const envKeys = GEO_STATIC_ENGINE_ENV[entry.id];
  if (!envKeys) {
    return true;
  }
  return envKeys.every(
    (envKey) => (process.env[envKey] ?? "").trim().length > 0
  );
}

function staticEntriesForProvider(
  providerId: GeoModelProviderId
): GeoModelCatalogEntry[] {
  return GEO_MODEL_CATALOG_STATIC.filter(
    (entry) =>
      entry.provider === providerId && isGeoStaticEngineAvailable(entry)
  );
}

export function buildGeoModelCatalogFromFeed(
  feed: readonly GeoGatewayModel[]
): GeoModelCatalog {
  const models: GeoModelCatalogEntry[] = [];
  for (const provider of GEO_MODEL_PROVIDERS) {
    const entries = feed
      .filter(
        (model) => model.owned_by === provider.id && isEligibleFeedModel(model)
      )
      .sort((left, right) => (right.released ?? 0) - (left.released ?? 0))
      .map((model) => toCatalogEntry(model, provider.id));
    const newest = entries.slice(0, GEO_MODELS_PER_PROVIDER);
    const olderDefaults = entries
      .slice(GEO_MODELS_PER_PROVIDER)
      .filter((entry) => entry.default);
    models.push(
      ...newest,
      ...olderDefaults,
      ...staticEntriesForProvider(provider.id)
    );
  }
  const providers = GEO_MODEL_PROVIDERS.filter((provider) =>
    models.some((model) => model.provider === provider.id)
  );
  return { providers, models };
}

export function seedGeoModelCatalog(): GeoModelCatalog {
  const models: GeoModelCatalogEntry[] = [];
  for (const provider of GEO_MODEL_PROVIDERS) {
    models.push(
      ...GEO_MODEL_CATALOG_SEED.filter(
        (entry) => entry.provider === provider.id
      ),
      ...staticEntriesForProvider(provider.id)
    );
  }
  const providers = GEO_MODEL_PROVIDERS.filter((provider) =>
    models.some((model) => model.provider === provider.id)
  );
  return { providers, models };
}

/** Catalog without the given engine ids; providers left empty are dropped. */
export function withoutGeoModelCatalogEntries(
  catalog: GeoModelCatalog,
  engineIds: readonly string[]
): GeoModelCatalog {
  const removed = new Set(engineIds);
  const models = catalog.models.filter((model) => !removed.has(model.id));
  const providers = catalog.providers.filter((provider) =>
    models.some((model) => model.provider === provider.id)
  );
  return { providers, models };
}

export function getGeoModelCatalogEntry(
  catalog: GeoModelCatalog,
  engine: string
): GeoModelCatalogEntry | undefined {
  return catalog.models.find((model) => model.id === engine);
}

/**
 * True when the model has at least one zero-data-retention host. Engines the
 * catalog does not know fail closed: nothing vouches for their hosts.
 */
export function isGeoEngineZdrCapable(
  catalog: GeoModelCatalog,
  engine: string
): boolean {
  const entry = getGeoModelCatalogEntry(catalog, engine);
  return entry ? entry.zdr !== "none" : false;
}

const STATIC_ENGINE_IDS = new Set(
  GEO_MODEL_CATALOG_STATIC.map((entry) => entry.id)
);

export function geoModelsForProvider(
  catalog: GeoModelCatalog,
  providerId: GeoModelProviderId
): GeoModelCatalogEntry[] {
  return catalog.models
    .filter((model) => model.provider === providerId)
    .sort((left, right) => {
      const leftStatic = STATIC_ENGINE_IDS.has(left.id);
      const rightStatic = STATIC_ENGINE_IDS.has(right.id);
      if (leftStatic !== rightStatic) {
        return leftStatic ? -1 : 1;
      }
      return right.released.localeCompare(left.released);
    });
}

export function geoDefaultEngines(catalog: GeoModelCatalog): string[] {
  const defaults = catalog.models
    .filter((model) => model.default)
    .map((model) => model.id);
  if (defaults.length > 0) {
    return defaults;
  }
  return catalog.models.slice(0, 1).map((model) => model.id);
}
