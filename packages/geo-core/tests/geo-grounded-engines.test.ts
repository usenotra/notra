import { describe, expect, test } from "bun:test";

import {
  GEO_MODEL_CATALOG_SEED,
  GEO_MODEL_PROVIDERS,
} from "../src/constants/geo-model-catalog";
import type { GeoModelCatalog } from "../src/types/geo";
import { engineModelOf } from "../src/utils/geo-engine-family";
import {
  resolveGeoGroundedZdrMode,
  resolveTrackedEngines,
  scopeGeoScanEngines,
} from "../src/utils/geo-engines";
import {
  resolveGroundedEngineByKey,
  resolveGroundedEngines,
} from "../src/utils/geo-grounded-engines";
import {
  buildGeoModelCatalogFromFeed,
  seedGeoModelCatalog,
} from "../src/utils/geo-model-catalog";

const catalog: GeoModelCatalog = {
  providers: [...GEO_MODEL_PROVIDERS],
  models: [...GEO_MODEL_CATALOG_SEED],
};

describe("selected grounded engines", () => {
  test("only plans selected models, even when older models remain in the catalog", () => {
    const selected = ["anthropic/claude-sonnet-5", "openai/gpt-5.6-sol"];
    const engines = resolveGroundedEngines(selected, catalog);
    expect(engines.map((engine) => engineModelOf(engine.key)).join(",")).toBe(
      selected.join(",")
    );
    expect(engines.map((engine) => engine.label).join(",")).toBe(
      "Claude Sonnet 5,GPT-5.6 Sol"
    );
    expect(
      engines.map((engine) => engine.model.split("/").at(-1)).join(",")
    ).toBe("claude-sonnet-5,gpt-5.6-sol");
    for (const engine of engines) {
      expect(resolveGroundedEngineByKey(engine.key)?.model).toBe(engine.model);
      expect(resolveGroundedEngineByKey(engine.key)?.provider).toBe(
        engine.provider
      );
    }
  });

  test("empty or unsupported selections do not inject default search models", () => {
    expect(resolveGroundedEngines([], catalog).length).toBe(0);
    expect(resolveGroundedEngines(["unlisted/model"], catalog).length).toBe(0);
    expect(resolveGroundedEngines(["moonshotai/kimi-k3"], catalog).length).toBe(
      0
    );
  });

  test("none of the six legacy web-search routes are added to a selection", () => {
    const legacyKeys = [
      "openai/gpt-5.4-grounded",
      "anthropic/claude-sonnet-4.6-grounded",
      "google/gemini-3-flash-grounded",
      "openai-direct-grounded",
      "anthropic-direct-grounded",
      "perplexity-sonar",
    ];
    const engines = resolveGroundedEngines(
      ["anthropic/claude-sonnet-5"],
      catalog
    );
    for (const key of legacyKeys) {
      expect(engines.some((engine) => engine.key === key)).toBe(false);
    }
    expect(engines.length).toBe(1);
  });

  test("deduplicates selected models", () => {
    expect(
      resolveGroundedEngines(
        ["anthropic/claude-sonnet-5", "anthropic/claude-sonnet-5"],
        catalog
      ).length
    ).toBe(1);
  });

  test("new catalog models work without adding version constants", () => {
    const futureCatalog: GeoModelCatalog = {
      providers: catalog.providers,
      models: [
        {
          id: "google/gemini-test-version",
          provider: "google",
          label: "Gemini test version",
          zdr: "all",
          released: "2099-01-01",
          default: false,
          gateways: ["vercel"],
        },
      ],
    };
    const engine = resolveGroundedEngines(
      ["google/gemini-test-version"],
      futureCatalog
    )[0];
    expect(engine?.model).toBe("google/gemini-test-version");
    expect(engine?.label).toBe("Gemini test version");
    const openRouterCatalog: GeoModelCatalog = {
      ...futureCatalog,
      models: futureCatalog.models.map((model) => ({
        ...model,
        gateways: ["openrouter"],
      })),
    };
    expect(
      resolveGroundedEngines(["google/gemini-test-version"], openRouterCatalog)
        .length
    ).toBe(0);
  });

  test("queued keys preserve the exact model rather than using a default", () => {
    expect(
      resolveGroundedEngineByKey("anthropic/claude-sonnet-5-grounded")?.model
    ).toBe("anthropic/claude-sonnet-5");
    expect(
      resolveGroundedEngineByKey("anthropic/claude-sonnet-4.6-grounded")?.model
    ).toBe("anthropic/claude-sonnet-4.6");
    expect(resolveGroundedEngineByKey("anthropic/claude-sonnet-5")).toBe(null);
  });

  test("historical direct results group under the actual model", () => {
    expect(engineModelOf("anthropic-direct-grounded")).toBe(
      "anthropic/claude-sonnet-4.6"
    );
    expect(engineModelOf("openai-direct-grounded")).toBe("openai/gpt-5.4");
    expect(engineModelOf("perplexity-sonar")).toBe("perplexity/sonar");
  });

  test("Sonar uses the gateway without a Perplexity key", () => {
    const previous = process.env.PERPLEXITY_API_KEY;
    try {
      delete process.env.PERPLEXITY_API_KEY;
      const sonarFeed = {
        id: "perplexity/sonar",
        name: "Sonar",
        owned_by: "perplexity",
        type: "language",
        zdr: "none" as const,
      };
      const feed = [
        sonarFeed,
        {
          id: "perplexity/sonar-pro",
          name: "Sonar Pro",
          owned_by: "perplexity",
          type: "language",
          zdr: "none" as const,
        },
      ];
      expect(
        buildGeoModelCatalogFromFeed(feed)
          .models.filter((model) => model.provider === "perplexity")
          .map((model) => model.id)
      ).toEqual(["perplexity/sonar"]);
      const partial = buildGeoModelCatalogFromFeed([
        {
          id: "openai/gpt-5.6-sol",
          name: "GPT-5.6 Sol",
          owned_by: "openai",
          type: "language",
          zdr: "some" as const,
        },
        ...feed.slice(1),
      ]);
      expect(partial.models.map((model) => model.id)).toEqual([
        "openai/gpt-5.6-sol",
        "perplexity/sonar",
      ]);
      expect(
        resolveGroundedEngines(["perplexity/sonar"], partial)[0]?.provider
      ).toBe("gateway-perplexity");
      for (const ineligible of [
        { ...sonarFeed, deprecated_at: 1 },
        { ...sonarFeed, type: "embedding" },
        { ...sonarFeed, tags: ["image-generation"] },
      ]) {
        const available = buildGeoModelCatalogFromFeed([
          ineligible,
          ...feed.slice(1),
        ]);
        expect(
          available.models.filter((model) => model.id === "perplexity/sonar")
        ).toEqual(
          seedGeoModelCatalog().models.filter(
            (model) => model.id === "perplexity/sonar"
          )
        );
        expect(
          resolveGroundedEngines(["perplexity/sonar"], available)[0]?.provider
        ).toBe("gateway-perplexity");
      }
      for (const available of [
        seedGeoModelCatalog(),
        buildGeoModelCatalogFromFeed(feed),
      ]) {
        const sonar = available.models.find(
          (model) => model.id === "perplexity/sonar"
        );
        expect(sonar?.gateways).toEqual(["vercel"]);
        const [grounded] = resolveGroundedEngines(
          ["perplexity/sonar"],
          available
        );
        expect(grounded?.key).toBe("perplexity/sonar-grounded");
        expect(grounded?.provider).toBe("gateway-perplexity");
        expect(grounded?.model).toBe("perplexity/sonar");
        expect(resolveGroundedEngineByKey(grounded?.key ?? "")?.model).toBe(
          "perplexity/sonar"
        );
        if (!grounded) {
          throw new Error("Sonar should have a grounded route");
        }
        expect(
          resolveGeoGroundedZdrMode(available, grounded, {
            enforceZdr: true,
            nonZdrApprovedEngines: [],
          })
        ).toBe(null);
        expect(
          resolveGeoGroundedZdrMode(available, grounded, {
            enforceZdr: true,
            nonZdrApprovedEngines: ["perplexity/sonar"],
          })
        ).toBe("preferred");
      }
      process.env.PERPLEXITY_API_KEY = "test-key";
      expect(
        resolveGroundedEngines(["perplexity/sonar"], seedGeoModelCatalog())[0]
          ?.provider
      ).toBe("gateway-perplexity");
    } finally {
      if (previous === undefined) {
        delete process.env.PERPLEXITY_API_KEY;
      } else {
        process.env.PERPLEXITY_API_KEY = previous;
      }
    }
  });

  test("older catalog models stay selectable until explicitly retired", () => {
    const feed = Array.from({ length: 12 }, (_, index) => ({
      id: `openai/example-${index}.0`,
      name: `Example ${index}`,
      owned_by: "openai",
      type: "language",
      zdr: "none" as const,
      released: 1_700_000_000 + index,
    }));
    const models = buildGeoModelCatalogFromFeed(feed).models.filter(
      (model) => model.provider === "openai"
    );
    expect(models).toHaveLength(12);
    expect(
      models.find((model) => model.id === "openai/example-0.0")?.hidden
    ).toBeUndefined();
  });

  test("retired Grok 4.6 is removed from feed and seed, then remapped for scans", () => {
    const feed = ["spacexai/grok-4.6", "spacexai/grok-4.7"].map((id) => ({
      id,
      name: id,
      owned_by: "spacexai",
      type: "language",
      zdr: "none" as const,
    }));
    for (const available of [
      buildGeoModelCatalogFromFeed(feed),
      seedGeoModelCatalog(),
    ]) {
      expect(
        available.models.some((model) => model.id === "spacexai/grok-4.6")
      ).toBe(false);
      expect(resolveTrackedEngines(available, ["spacexai/grok-4.6"])).toEqual([
        "spacexai/grok-4.7",
      ]);
      expect(scopeGeoScanEngines(available, [], ["spacexai/grok-4.6"])).toEqual(
        ["spacexai/grok-4.7"]
      );
    }
  });
});
