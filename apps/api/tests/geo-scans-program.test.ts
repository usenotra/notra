import { beforeEach, describe, expect, mock, test } from "bun:test";

import { Effect } from "effect";

type FindManyArgs = {
  where: unknown;
  limit: number;
  offset: number;
};

let capturedFindManyArgs: FindManyArgs | undefined;
let capturedFindFirstArgs: { where: unknown } | undefined;
let capturedCountWhere: unknown;

function collectSqlText(fragment: unknown): string {
  if (fragment instanceof Date) {
    return fragment.toISOString();
  }

  if (!fragment || typeof fragment !== "object") {
    return String(fragment);
  }

  if ("queryChunks" in fragment && Array.isArray(fragment.queryChunks)) {
    return fragment.queryChunks.map(collectSqlText).join("");
  }

  if (
    "name" in fragment &&
    typeof (fragment as { name: unknown }).name === "string"
  ) {
    return (fragment as { name: string }).name;
  }

  if ("value" in fragment) {
    const value = (fragment as { value: unknown }).value;
    if (Array.isArray(value)) {
      return value.map((entry) => collectSqlText(entry)).join("");
    }

    return collectSqlText(value);
  }

  return String(fragment);
}

function expectTenantScopedWhere(where: unknown) {
  const sql = collectSqlText(where);
  expect(sql).toContain("organization_id");
  expect(sql).toContain("project_id");
  expect(sql).toContain("org");
  expect(sql).toContain("project");
}

const findFirst = mock(async (args: { where: unknown }) => {
  capturedFindFirstArgs = args;
  return null;
});
const findMany = mock(async (args: FindManyArgs) => {
  capturedFindManyArgs = args;
  return [];
});
const countSelect = mock(async () => [{ value: 0 }]);

mock.module("@notra/db/drizzle", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (where: unknown) => {
          capturedCountWhere = where;
          return countSelect();
        },
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

beforeEach(() => {
  capturedFindManyArgs = undefined;
  capturedFindFirstArgs = undefined;
  capturedCountWhere = undefined;
  findFirst.mockClear();
  findMany.mockClear();
  countSelect.mockClear();
  findFirst.mockImplementation(async (args: { where: unknown }) => {
    capturedFindFirstArgs = args;
    return null;
  });
  findMany.mockImplementation(async (args: FindManyArgs) => {
    capturedFindManyArgs = args;
    return [];
  });
});

describe("listGeoScansForProject", () => {
  test("scopes list queries by organization and project with pagination", async () => {
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
    expect(capturedFindManyArgs).toBeDefined();
    expect(capturedFindManyArgs?.limit).toBe(20);
    expect(capturedFindManyArgs?.offset).toBe(0);
    expectTenantScopedWhere(capturedFindManyArgs?.where);
    expectTenantScopedWhere(capturedCountWhere);
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
    expect(capturedFindFirstArgs).toBeDefined();
    const sql = collectSqlText(capturedFindFirstArgs?.where);
    expect(sql).toContain("id");
    expect(sql).toContain("missing");
    expectTenantScopedWhere(capturedFindFirstArgs?.where);
  });

  test("serializes a stored scan row", async () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    findFirst.mockImplementationOnce(async (args: { where: unknown }) => {
      capturedFindFirstArgs = args;
      return {
        id: "scan-1",
        projectId: "project",
        status: "running",
        startedAt,
        finishedAt: null,
        createdAt,
      };
    });

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
    expectTenantScopedWhere(capturedFindFirstArgs?.where);
    expect(collectSqlText(capturedFindFirstArgs?.where)).toContain("scan-1");
  });
});
