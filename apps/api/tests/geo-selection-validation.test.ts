import { describe, expect, mock, test } from "bun:test";

import { SUPPORTED_GEO_LANGUAGES } from "@notra/geo-core/utils/geo-language-rows";
import { seedGeoModelCatalog } from "@notra/geo-core/utils/geo-model-catalog";
import { Effect } from "effect";

mock.module("@notra/geo-core/geo/model-catalog", () => ({
  loadGeoModelCatalog: () => Effect.succeed(seedGeoModelCatalog()),
}));

const { validateGeoSelection } = await import("../src/programs/geo");
const { runGeoEffect } = await import("../src/runtime/geo");
const { GeoSelectionInvalidError } = await import("../src/errors/geo");

describe("validateGeoSelection", () => {
  test("accepts engines and languages from the catalog", async () => {
    const catalog = seedGeoModelCatalog();
    const engine = catalog.models[0]?.id;
    const language = SUPPORTED_GEO_LANGUAGES[0];
    if (!engine || !language) {
      throw new Error(
        "Expected seeded catalog to include an engine and language"
      );
    }

    await Effect.runPromise(
      validateGeoSelection({
        organizationId: "org",
        engines: [engine],
        languages: [language],
      })
    );
  });

  test("rejects unknown engines with a client-safe message", async () => {
    const language = SUPPORTED_GEO_LANGUAGES[0];
    if (!language) {
      throw new Error("Expected supported GEO languages to be configured");
    }

    const outcome = await Effect.runPromise(
      Effect.result(
        validateGeoSelection({
          organizationId: "org",
          engines: ["not-a-real-engine"],
          languages: [language],
        })
      )
    );

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoSelectionInvalidError);
      expect(outcome.failure.message).toContain("Unknown engines");
      expect(outcome.failure.message).toContain("not-a-real-engine");
    }
  });

  test("maps selection failures to 400 through runGeoEffect", async () => {
    const language = SUPPORTED_GEO_LANGUAGES[0];
    if (!language) {
      throw new Error("Expected supported GEO languages to be configured");
    }

    const outcome = await runGeoEffect(
      "selection",
      validateGeoSelection({
        organizationId: "org",
        engines: ["not-a-real-engine"],
        languages: [language],
      })
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.status).toBe(400);
      expect(outcome.failure.error).toContain("Unknown engines");
    }
  });

  test("rejects unknown languages with a client-safe message", async () => {
    const catalog = seedGeoModelCatalog();
    const engine = catalog.models[0]?.id;
    if (!engine) {
      throw new Error("Expected seeded catalog to include an engine");
    }

    const outcome = await Effect.runPromise(
      Effect.result(
        validateGeoSelection({
          organizationId: "org",
          engines: [engine],
          languages: ["zz"],
        })
      )
    );

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoSelectionInvalidError);
      expect(outcome.failure.message).toContain("Unknown languages");
      expect(outcome.failure.message).toContain("zz");
    }
  });
});
