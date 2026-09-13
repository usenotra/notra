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
  GEO_REMOTE_SEQUENCE_RUN,
  GEO_REMOTE_WRITER_PLAN,
  resolveRemoteGeoUrl,
  runConfiguredRemoteGeoEffect,
} = await import("../src/runtime/geo-remote");

describe("resolveRemoteGeoUrl", () => {
  test("returns null when WORKFLOW_BASE_URL is missing", () => {
    expect(resolveRemoteGeoUrl({}, GEO_REMOTE_WRITER_PLAN)).toBeNull();
  });

  test("joins the configured base URL with the operation path", () => {
    expect(
      resolveRemoteGeoUrl(
        { WORKFLOW_BASE_URL: "https://dashboard.test" },
        GEO_REMOTE_SEQUENCE_RUN
      )
    ).toBe("https://dashboard.test/api/internal/geo/sequence-run");
  });
});

describe("runConfiguredRemoteGeoEffect", () => {
  test("maps remote timeouts to 409 with the operation message", async () => {
    const outcome = await runConfiguredRemoteGeoEffect(
      GEO_REMOTE_WRITER_PLAN,
      "https://dashboard.test/api/internal/geo/writer-plan",
      { organizationId: "org", projectId: "project" }
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.status).toBe(409);
      expect(outcome.failure.error).toBe(GEO_REMOTE_WRITER_PLAN.timeoutMessage);
    }
  });

  test("uses the sequence-run operation config", async () => {
    const outcome = await runConfiguredRemoteGeoEffect(
      GEO_REMOTE_SEQUENCE_RUN,
      "https://dashboard.test/api/internal/geo/sequence-run",
      { organizationId: "org", projectId: "project", sequenceId: "seq" }
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.status).toBe(409);
      expect(outcome.failure.error).toBe(
        GEO_REMOTE_SEQUENCE_RUN.timeoutMessage
      );
    }
  });
});
