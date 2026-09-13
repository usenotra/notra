import { describe, expect, mock, test } from "bun:test";

import { InternalDashboardTimeoutError } from "@notra/schemas/api/internal-dashboard";

const internalWorkflow = await import("../src/utils/internal-workflow");

mock.module("../src/utils/internal-workflow", () => ({
  ...internalWorkflow,
  callDashboardInternal: async () => {
    throw new InternalDashboardTimeoutError(240_000);
  },
}));

const {
  GEO_REMOTE_WRITER_PLAN,
  resolveRemoteGeoUrl,
  runConfiguredRemoteGeoEffect,
} = await import("../src/runtime/geo-remote");

describe("geo-remote", () => {
  test("resolves dashboard URLs for configured operations", () => {
    expect(resolveRemoteGeoUrl({}, GEO_REMOTE_WRITER_PLAN)).toBeNull();
    expect(
      resolveRemoteGeoUrl(
        { WORKFLOW_BASE_URL: "https://dashboard.test" },
        GEO_REMOTE_WRITER_PLAN
      )
    ).toBe("https://dashboard.test/api/internal/geo/writer-plan");
  });

  test("maps configured remote timeouts to 409 with the operation message", async () => {
    const outcome = await runConfiguredRemoteGeoEffect(
      GEO_REMOTE_WRITER_PLAN,
      "https://dashboard.test/api/internal/geo/writer-plan",
      { organizationId: "org", projectId: "project" }
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure).toEqual({
        status: 409,
        error: GEO_REMOTE_WRITER_PLAN.timeoutMessage,
      });
    }
  });
});
