import { describe, expect, test } from "bun:test";

import {
  GEO_AI_OVERVIEW_ENGINE_ID,
  GEO_LANGUAGE_MAX_PROMPTS,
} from "../src/constants/geo";
import {
  GEO_MODEL_CATALOG_SEED,
  GEO_MODEL_PROVIDERS,
} from "../src/constants/geo-model-catalog";
import type { GeoResolvedModelCatalog } from "../src/types/geo";
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

describe("scan size with a non-English prompt language", () => {
  test("prompts in the prompt language are not capped as translations", () => {
    expect(
      calcGeoScanSize({
        promptCount: 8,
        engines: ["anthropic/claude-sonnet-5"],
        languages: ["German"],
        promptLanguage: "German",
        catalog,
        sequences: [],
      })
    ).toBe(8);
  });

  test("English becomes a capped translation of German prompts", () => {
    expect(
      calcGeoScanSize({
        promptCount: 8,
        engines: ["anthropic/claude-sonnet-5"],
        languages: ["German", "English"],
        promptLanguage: "German",
        catalog,
        sequences: [],
      })
    ).toBe(8 + GEO_LANGUAGE_MAX_PROMPTS);
  });
});

test("picked translations replace the per-language limit", () => {
  expect(
    calcGeoScanSize({
      promptCount: 8,
      engines: ["anthropic/claude-sonnet-5"],
      languages: ["German", "English", "French"],
      promptLanguage: "German",
      translatedPromptCounts: { English: 2 },
      catalog,
      sequences: [],
    })
  ).toBe(8 + 2 + GEO_LANGUAGE_MAX_PROMPTS);
});
