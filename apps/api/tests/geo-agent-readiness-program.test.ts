import { beforeEach, describe, expect, mock, test } from "bun:test";

import { GeoSettingsMissingError } from "@notra/geo-core/geo/errors";
import { Effect } from "effect";

const readinessScope = {
  organizationId: "org",
  projectId: "project",
  brandSettingsId: "brand",
};

const loadAgentReadiness = mock(() =>
  Effect.succeed({
    targetUrl: "https://example.com",
    report: null,
    scan: null,
    history: [],
  })
);

const startAgentReadinessScan = mock(() =>
  Effect.succeed({ reportId: "report-1", alreadyRunning: false })
);

const requireGeoProject = mock(() => Effect.succeed(readinessScope));

mock.module("@notra/geo-core/geo/projects", () => ({
  requireGeoProject,
}));

mock.module("@notra/geo-core/geo/agent-readiness", () => ({
  loadAgentReadiness,
  startAgentReadinessScan,
}));

const { getGeoAgentReadiness, startGeoAgentReadinessScanForProject } =
  await import("../src/programs/geo");

const missingSettingsError = new GeoSettingsMissingError({
  organizationId: "org",
});

beforeEach(() => {
  requireGeoProject.mockReset();
  requireGeoProject.mockImplementation(() => Effect.succeed(readinessScope));
  loadAgentReadiness.mockClear();
  startAgentReadinessScan.mockClear();
});

describe("getGeoAgentReadiness", () => {
  test("resolves the project before loading readiness", async () => {
    const outcome = await Effect.runPromise(
      getGeoAgentReadiness({
        organizationId: "org",
        projectId: "project",
      })
    );

    expect(requireGeoProject).toHaveBeenCalledWith({
      organizationId: "org",
      projectId: "project",
    });
    expect(loadAgentReadiness).toHaveBeenCalledWith(readinessScope);
    expect(outcome.targetUrl).toBe("https://example.com");
  });

  test("does not load readiness when requireGeoProject fails", async () => {
    requireGeoProject.mockImplementationOnce(() =>
      Effect.fail(missingSettingsError)
    );

    const outcome = await Effect.runPromise(
      Effect.result(
        getGeoAgentReadiness({
          organizationId: "org",
          projectId: "project",
        })
      )
    );

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBe(missingSettingsError);
    }
    expect(loadAgentReadiness).not.toHaveBeenCalled();
  });
});

describe("startGeoAgentReadinessScanForProject", () => {
  test("resolves the project before starting a scan", async () => {
    const outcome = await Effect.runPromise(
      startGeoAgentReadinessScanForProject({
        organizationId: "org",
        projectId: "project",
      })
    );

    expect(requireGeoProject).toHaveBeenCalledWith({
      organizationId: "org",
      projectId: "project",
    });
    expect(startAgentReadinessScan).toHaveBeenCalledWith(readinessScope);
    expect(outcome).toEqual({ reportId: "report-1", alreadyRunning: false });
  });

  test("does not start a scan when requireGeoProject fails", async () => {
    requireGeoProject.mockImplementationOnce(() =>
      Effect.fail(missingSettingsError)
    );

    const outcome = await Effect.runPromise(
      Effect.result(
        startGeoAgentReadinessScanForProject({
          organizationId: "org",
          projectId: "project",
        })
      )
    );

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBe(missingSettingsError);
    }
    expect(startAgentReadinessScan).not.toHaveBeenCalled();
  });
});
