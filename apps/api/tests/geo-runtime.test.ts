import { describe, expect, mock, test } from "bun:test";

import { InternalDashboardTimeoutError } from "@notra/schemas/api/internal-dashboard";
import { z } from "zod";

const internalWorkflow = await import("../src/utils/internal-workflow");

mock.module("../src/utils/internal-workflow", () => ({
  ...internalWorkflow,
  callDashboardInternal: async () => {
    throw new InternalDashboardTimeoutError(1_000);
  },
}));

const { runRemoteGeoEffect } = await import("../src/runtime/geo");

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
