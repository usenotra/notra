import { describe, expect, test } from "bun:test";

import { GEO_AI_OVERVIEW_ENGINE_ID } from "../src/constants/geo";
import {
  GEO_MODEL_CATALOG_SEED,
  GEO_MODEL_PROVIDERS,
} from "../src/constants/geo-model-catalog";
import type { GeoResolvedModelCatalog } from "../src/types/geo";
import { isGeoNativeSearchEngine } from "../src/utils/geo-engines";
import { resolveGroundedEngines } from "../src/utils/geo-grounded-engines";
import { calcGeoScanSize } from "../src/utils/geo-scan";

const catalog: GeoResolvedModelCatalog = {
  providers: [...GEO_MODEL_PROVIDERS],
  models: [
    ...GEO_MODEL_CATALOG_SEED.map((model) => ({
      ...model,
      supportsGroundedChecks:
        resolveGroundedEngines([model.id], {
          providers: [...GEO_MODEL_PROVIDERS],
          models: [...GEO_MODEL_CATALOG_SEED],
        }).length > 0,
    })),
    {
      id: GEO_AI_OVERVIEW_ENGINE_ID,
      provider: "google",
      label: "AI Overview",
      zdr: "none",
      released: "2026-09-05",
      default: false,
      gateways: ["serpapi"],
      supportsGroundedChecks: false,
    },
    {
      id: "opencode/gpt-5.6-sol-medium",
      provider: "opencode",
      label: "OpenCode",
      zdr: "none",
      released: "2026-08-21",
      default: false,
      gateways: ["box"],
      supportsGroundedChecks: false,
    },
    {
      id: "cursor/composer-2.5",
      provider: "cursor",
      label: "Composer 2.5",
      zdr: "none",
      released: "2026-08-01",
      default: false,
      gateways: ["cursor"],
      supportsGroundedChecks: false,
    },
  ],
};

describe("native search engines", () => {
  test("SerpApi and Box search; Cursor and bare catalog models do not", () => {
    expect(isGeoNativeSearchEngine(catalog, GEO_AI_OVERVIEW_ENGINE_ID)).toBe(
      true
    );
    expect(
      isGeoNativeSearchEngine(catalog, "opencode/gpt-5.6-sol-medium")
    ).toBe(true);
    expect(isGeoNativeSearchEngine(catalog, "cursor/composer-2.5")).toBe(false);
    expect(isGeoNativeSearchEngine(catalog, "anthropic/claude-sonnet-5")).toBe(
      false
    );
    expect(isGeoNativeSearchEngine(catalog, "deepseek/deepseek-v4-pro")).toBe(
      false
    );
  });
});

describe("scan size without bare model calls", () => {
  test("catalog models only count their web-search checks", () => {
    expect(
      calcGeoScanSize({
        promptCount: 8,
        engines: ["anthropic/claude-sonnet-5", "deepseek/deepseek-v4-pro"],
        languages: ["English"],
        catalog,
        sequences: [],
      })
    ).toBe(8);
  });

  test("AI Overview still counts every prompt; Cursor does not", () => {
    expect(
      calcGeoScanSize({
        promptCount: 8,
        engines: [GEO_AI_OVERVIEW_ENGINE_ID, "cursor/composer-2.5"],
        languages: ["English"],
        catalog,
        sequences: [],
      })
    ).toBe(8);
  });
});
