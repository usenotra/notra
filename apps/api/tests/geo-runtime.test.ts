import { describe, expect, mock, test } from "bun:test";

import { AgentReadinessTargetMissingError } from "@notra/geo-core/schemas/agent-readiness-errors";
import { SUPPORTED_GEO_LANGUAGES } from "@notra/geo-core/utils/geo-language-rows";
import { seedGeoModelCatalog } from "@notra/geo-core/utils/geo-model-catalog";
import { InternalDashboardTimeoutError } from "@notra/schemas/api/internal-dashboard";
import { Effect } from "effect";
import { z } from "zod";

import { GeoScanNotFoundError } from "../src/errors/geo";

mock.module("@notra/geo-core/geo/model-catalog", () => ({
  loadGeoModelCatalog: () => Effect.succeed(seedGeoModelCatalog()),
}));

const internalWorkflow = await import("../src/utils/internal-workflow");

mock.module("../src/utils/internal-workflow", () => ({
  ...internalWorkflow,
  callDashboardInternal: async () => {
    throw new InternalDashboardTimeoutError(1_000);
  },
}));

const { validateGeoSelection } = await import("../src/programs/geo");
const { runGeoEffect, runRemoteGeoEffect } = await import("../src/runtime/geo");

describe("runGeoEffect", () => {
  test("maps AgentReadinessTargetMissingError to 400", async () => {
    const outcome = await runGeoEffect(
      "agentReadiness",
      Effect.fail(
        new AgentReadinessTargetMissingError({
          message: "Add a website URL before scanning",
        })
      )
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.status).toBe(400);
      expect(outcome.failure.error).toBe("Add a website URL before scanning");
    }
  });

  test("maps GeoScanNotFoundError to 404", async () => {
    const outcome = await runGeoEffect(
      "getScan",
      Effect.fail(new GeoScanNotFoundError({ scanId: "missing" }))
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.status).toBe(404);
      expect(outcome.failure.error).toBe("Scan not found");
    }
  });

  test("maps GeoSelectionInvalidError to 400", async () => {
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
      expect(outcome.failure.error).toContain("not-a-real-engine");
    }
  });
});

describe("runRemoteGeoEffect", () => {
  test("maps remote timeouts to 409 with the caller message", async () => {
    const outcome = await runRemoteGeoEffect(
      "test",
      "https://example.test/internal/geo",
      {},
      {
        responseSchema: z.object({ ok: z.boolean() }),
        timeoutMs: 1_000,
        timeoutMessage: "Still working; do not retry",
      }
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.status).toBe(409);
      expect(outcome.failure.error).toBe("Still working; do not retry");
    }
  });
});
