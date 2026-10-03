import type { GeoModelCatalogEntry } from "@notra/geo-core/types/geo";

import type { GeoScanModelOption } from "@/types/geo-scan-activity";
import { formatEngineFamily } from "@/utils/geo-charts";

interface BuildScanModelOptionsInput {
  tracked: readonly string[];
  catalog?: readonly GeoModelCatalogEntry[];
  enforceZdr?: boolean;
  nonZdrApprovedEngines?: readonly string[];
}

/**
 * Tracked models first (in settings order), then every other catalog model.
 * Models a ZDR project would skip stay visible but cannot be selected.
 */
export function buildScanModelOptions({
  tracked,
  catalog,
  enforceZdr = false,
  nonZdrApprovedEngines = [],
}: BuildScanModelOptionsInput): GeoScanModelOption[] {
  const trackedIds = new Set(tracked);
  const approved = new Set(nonZdrApprovedEngines);
  const models = new Map(catalog?.map((model) => [model.id, model]));
  const toOption = (id: string): GeoScanModelOption => {
    const model = models.get(id);
    return {
      id,
      label: model?.label ?? formatEngineFamily(id),
      tracked: trackedIds.has(id),
      zdrBlocked:
        enforceZdr && model?.zdr === "none" && !approved.has(model.id),
    };
  };
  const untracked = (catalog ?? []).filter(
    (model) => !trackedIds.has(model.id)
  );
  return [
    ...tracked.map(toOption),
    ...untracked.map((model) => toOption(model.id)),
  ];
}

export function filterScanModelOptions(
  options: readonly GeoScanModelOption[],
  query: string
): GeoScanModelOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...options];
  }
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(needle) ||
      option.id.toLowerCase().includes(needle)
  );
}

/**
 * Engines to send for a menu selection. `undefined` when it is exactly the
 * tracked set, so the run stays a regular full scan. Untracked catalog
 * models are kept, unlike the tracked-only preflight dialog.
 */
export function scanModelSelectionToSubmit(
  tracked: readonly string[],
  selected: readonly string[]
): string[] | undefined {
  const trackedIds = new Set(tracked);
  const isTrackedSet =
    selected.length === trackedIds.size &&
    selected.every((id) => trackedIds.has(id));
  return isTrackedSet ? undefined : [...selected];
}

export function defaultScanModelSelection(
  options: readonly GeoScanModelOption[]
): Set<string> {
  return new Set(
    options
      .filter((option) => option.tracked && !option.zdrBlocked)
      .map((option) => option.id)
  );
}
