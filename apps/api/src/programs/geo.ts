import { loadGeoModelCatalog } from "@notra/geo-core/geo/model-catalog";
import { upsertGeoSettings } from "@notra/geo-core/geo/programs";
import type { GeoSettingsUpsertInput } from "@notra/geo-core/types/geo";
import {
  isSupportedGeoLanguage,
  SUPPORTED_GEO_LANGUAGES,
} from "@notra/geo-core/utils/geo-language-rows";
import { Effect } from "effect";

import { GeoSelectionInvalidError } from "../errors/geo";

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
