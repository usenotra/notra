import {
  GEO_ENGINE_LABELS,
  GEO_GROUNDED_PROVIDERS,
  GEO_LEGACY_GROUNDED_MODELS,
} from "../constants/geo";
import type { GeoGroundedEngine, GeoModelCatalog } from "../types/geo";
import { engineModelOf } from "./geo-engine-family";

const GATEWAY_GROUNDED_PROVIDER_IDS: ReadonlySet<string> = new Set(
  GEO_GROUNDED_PROVIDERS.filter((entry) =>
    entry.provider.startsWith("gateway-")
  ).map((entry) => entry.provider.slice("gateway-".length))
);

/** Whether the scan planner also runs this model as a web-search engine. */
export function hasGroundedVariant(engine: string): boolean {
  const modelId = engineModelOf(engine);
  const separator = modelId.indexOf("/");
  return (
    separator > 0 &&
    GATEWAY_GROUNDED_PROVIDER_IDS.has(modelId.slice(0, separator))
  );
}

/** Reconstruct the exact model and route recorded by the scan planner. */
export function resolveGroundedEngineByKey(
  key: string
): GeoGroundedEngine | null {
  const legacyModel = GEO_LEGACY_GROUNDED_MODELS[key];
  if (!legacyModel && !key.endsWith("-grounded")) {
    return null;
  }
  const modelId = legacyModel ?? engineModelOf(key);
  const separator = modelId.indexOf("/");
  if (separator <= 0 || separator === modelId.length - 1) {
    return null;
  }
  const providerId = modelId.slice(0, separator);
  const direct = Boolean(legacyModel) || key.endsWith("-direct-grounded");
  const provider = GEO_GROUNDED_PROVIDERS.find(
    (entry) =>
      entry.provider === `${direct ? "direct" : "gateway"}-${providerId}`
  );
  if (!provider?.isAvailable()) {
    return null;
  }
  const slug = modelId.slice(separator + 1);
  let model = modelId;
  if (direct) {
    model =
      providerId === "anthropic" ? slug.replace(/(\d)\.(\d)/g, "$1-$2") : slug;
  }
  return {
    ...provider,
    key,
    model,
    label: GEO_ENGINE_LABELS[modelId] ?? GEO_ENGINE_LABELS[key] ?? modelId,
  };
}

/** Web-search variants of explicitly selected models; never add other models. */
export function resolveGroundedEngines(
  selectedEngines: readonly string[],
  catalog: GeoModelCatalog
): GeoGroundedEngine[] {
  return [...new Set(selectedEngines)].flatMap((modelId) => {
    const model = catalog.models.find((entry) => entry.id === modelId);
    if (!model) {
      return [];
    }
    const direct = resolveGroundedEngineByKey(`${modelId}-direct-grounded`);
    const engine =
      direct ??
      (model.gateways.includes("vercel")
        ? resolveGroundedEngineByKey(`${modelId}-grounded`)
        : null);
    return engine ? [{ ...engine, label: model.label }] : [];
  });
}
