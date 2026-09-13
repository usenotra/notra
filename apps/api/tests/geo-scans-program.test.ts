import { describe, expect, mock, test } from "bun:test";

import { Effect } from "effect";

const findFirst = mock(async () => null);
const findMany = mock(async () => []);
const countSelect = mock(async () => [{ value: 0 }]);

mock.module("@notra/db/drizzle", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => countSelect(),
      }),
    }),
    query: {
      geoScans: {
        findMany,
        findFirst,
      },
    },
  },
}));

const { getGeoScanForProject, listGeoScansForProject } =
  await import("../src/programs/geo");
const { GeoScanNotFoundError } = await import("../src/errors/geo");

describe("listGeoScansForProject", () => {
  test("returns an empty page with pagination metadata", async () => {
    const outcome = await Effect.runPromise(
      listGeoScansForProject({
        organizationId: "org",
        projectId: "project",
        limit: 20,
        page: 1,
      })
    );

    expect(outcome.scans).toEqual([]);
    expect(outcome.pagination).toEqual({
      limit: 20,
      currentPage: 1,
      nextPage: null,
      previousPage: null,
      totalPages: 1,
      totalItems: 0,
    });
  });
});

describe("getGeoScanForProject", () => {
  test("fails with GeoScanNotFoundError when the scan is missing", async () => {
    const outcome = await Effect.runPromise(
      Effect.result(
        getGeoScanForProject({
          organizationId: "org",
          projectId: "project",
          scanId: "missing",
        })
      )
    );

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoScanNotFoundError);
    }
  });

  test("serializes a stored scan row", async () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    findFirst.mockImplementationOnce(async () => ({
      id: "scan-1",
      projectId: "project",
      status: "running",
      startedAt,
      finishedAt: null,
      createdAt,
    }));

    const outcome = await Effect.runPromise(
      getGeoScanForProject({
        organizationId: "org",
        projectId: "project",
        scanId: "scan-1",
      })
    );

    expect(outcome.scan).toEqual({
      id: "scan-1",
      projectId: "project",
      status: "running",
      startedAt: startedAt.toISOString(),
      finishedAt: null,
      createdAt: createdAt.toISOString(),
    });
  });
});
