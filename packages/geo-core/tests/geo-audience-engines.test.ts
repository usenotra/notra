import { expect, test } from "bun:test";

import { GEO_GENERAL_AUDIENCE_ENGINE_IDS } from "../src/constants/geo-model-catalog";
import {
  geoDefaultEngines,
  geoEnginesForAudience,
  seedGeoModelCatalog,
} from "../src/utils/geo-model-catalog";

test("technical and unclassified brands keep the full default set", () => {
  const catalog = seedGeoModelCatalog();
  const defaults = geoDefaultEngines(catalog);
  expect(geoEnginesForAudience(catalog, "technical")).toEqual(defaults);
  expect(geoEnginesForAudience(catalog, undefined)).toEqual(defaults);
});

test("general brands track the assistant app defaults", () => {
  const catalog = seedGeoModelCatalog();
  const engines = geoEnginesForAudience(catalog, "general");
  expect(engines).toEqual([...GEO_GENERAL_AUDIENCE_ENGINE_IDS]);
  expect(engines.length).toBeLessThan(geoDefaultEngines(catalog).length);
});

test("general falls back to the defaults when its models left the catalog", () => {
  const seed = seedGeoModelCatalog();
  const general = new Set(GEO_GENERAL_AUDIENCE_ENGINE_IDS);
  const catalog = {
    ...seed,
    models: seed.models.filter((model) => !general.has(model.id)),
  };
  expect(geoEnginesForAudience(catalog, "general")).toEqual(
    geoDefaultEngines(catalog)
  );
});
