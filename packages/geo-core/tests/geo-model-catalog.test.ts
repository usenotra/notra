import { expect, test } from "bun:test";

import {
  GEO_MODEL_CATALOG_SEED,
  GEO_MODEL_PROVIDERS,
} from "../src/constants/geo-model-catalog";
import { geoEnginesForAudience } from "../src/utils/geo-model-catalog";

test("technical defaults skip GPT-6 without ZDR but retain it in the catalog", () => {
  const catalog = {
    providers: [...GEO_MODEL_PROVIDERS],
    models: [...GEO_MODEL_CATALOG_SEED],
  };
  expect(catalog.models.some((model) => model.id === "openai/gpt-6-sol")).toBe(
    true
  );
  expect(geoEnginesForAudience(catalog, "technical")).not.toContain(
    "openai/gpt-6-sol"
  );
  expect(geoEnginesForAudience(catalog, "technical")).toContain(
    "openai/gpt-5.6-sol"
  );
});
