import { beforeEach, describe, expect, mock, test } from "bun:test";

import { SUPPORTED_GEO_LANGUAGES } from "@notra/geo-core/utils/geo-language-rows";
import { seedGeoModelCatalog } from "@notra/geo-core/utils/geo-model-catalog";
import { Effect } from "effect";

const upsertSpy = mock(() =>
  Effect.succeed({
    configured: true,
    settings: null,
  })
);

mock.module("@notra/geo-core/geo/model-catalog", () => ({
  loadGeoModelCatalog: () => Effect.succeed(seedGeoModelCatalog()),
}));

mock.module("@notra/geo-core/geo/programs", () => ({
  upsertGeoSettings: upsertSpy,
}));

const { validateGeoSelection, upsertGeoSettingsWithValidation } =
  await import("../src/programs/geo");
const { GeoSelectionInvalidError } = await import("../src/errors/geo");

function validUpsertInput() {
  const catalog = seedGeoModelCatalog();
  const engine = catalog.models[0]?.id;
  const language = SUPPORTED_GEO_LANGUAGES[0];
  if (!engine || !language) {
    throw new Error(
      "Expected seeded catalog to include an engine and language"
    );
  }

  return {
    organizationId: "org",
    projectId: "project",
    companyName: "Acme",
    aliases: [],
    competitors: [],
    languages: [language],
    engines: [engine],
    enforceZdr: false,
    nonZdrApprovedEngines: [],
    enabled: true,
    scanIntervalHours: 24,
  };
}

describe("validateGeoSelection", () => {
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

describe("upsertGeoSettingsWithValidation", () => {
  beforeEach(() => {
    upsertSpy.mockClear();
  });

  test("runs upsert after validation passes", async () => {
    const input = validUpsertInput();

    const outcome = await Effect.runPromise(
      upsertGeoSettingsWithValidation(input)
    );

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy).toHaveBeenCalledWith(input);
    expect(outcome).toEqual({ configured: true, settings: null });
  });

  test("does not run upsert when validation fails", async () => {
    const input = {
      ...validUpsertInput(),
      engines: ["not-a-real-engine"],
    };

    const outcome = await Effect.runPromise(
      Effect.result(upsertGeoSettingsWithValidation(input))
    );

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoSelectionInvalidError);
    }
  });
});
