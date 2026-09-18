import { expect, test } from "bun:test";

import { GEO_AI_OVERVIEW_ENGINE_ID } from "../src/constants/geo";
import {
  GEO_COMMERCE_AUDIENCE_ENGINE_IDS,
  GEO_GENERAL_AUDIENCE_ENGINE_IDS,
} from "../src/constants/geo-model-catalog";
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

test("commerce brands add the Google AI Overview when it is available", () => {
  const seed = seedGeoModelCatalog();
  const withOverview = {
    ...seed,
    models: [
      ...seed.models.filter((model) => model.id !== GEO_AI_OVERVIEW_ENGINE_ID),
      {
        id: GEO_AI_OVERVIEW_ENGINE_ID,
        provider: "google" as const,
        label: "Google AI Overview",
        zdr: "none" as const,
        released: "2026-09-05",
        default: false,
        gateways: ["serpapi" as const],
      },
    ],
  };
  expect(geoEnginesForAudience(withOverview, "commerce")).toEqual([
    ...GEO_COMMERCE_AUDIENCE_ENGINE_IDS,
  ]);

  const withoutOverview = {
    ...seed,
    models: seed.models.filter(
      (model) => model.id !== GEO_AI_OVERVIEW_ENGINE_ID
    ),
  };
  expect(geoEnginesForAudience(withoutOverview, "commerce")).toEqual([
    ...GEO_GENERAL_AUDIENCE_ENGINE_IDS,
  ]);
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
