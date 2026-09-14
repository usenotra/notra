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
let capturedAggregateWhere: unknown;

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

function collectBoundValues(fragment: unknown): string[] {
  if (!fragment || typeof fragment !== "object") {
    return [];
  }

  const values: string[] = [];

  if ("value" in fragment) {
    const value = (fragment as { value: unknown }).value;
    if (typeof value === "string") {
      values.push(value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        values.push(...collectBoundValues(entry));
      }
    } else if (value != null && typeof value === "object") {
      values.push(...collectBoundValues(value));
    }
  }

  if ("queryChunks" in fragment && Array.isArray(fragment.queryChunks)) {
    for (const chunk of fragment.queryChunks) {
      values.push(...collectBoundValues(chunk));
    }
  }

  return values;
}

function expectTenantScopedWhere(where: unknown) {
  const sql = collectSqlText(where);
  expect(sql).toContain("organization_id");
  expect(sql).toContain("project_id");

  const values = collectBoundValues(where);
  expect(values).toContain("org");
  expect(values).toContain("project");
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
const aggregateSelect = mock(async () => [] as Array<Record<string, unknown>>);

mock.module("@notra/db/drizzle", () => ({
  db: {
    select: (selection: Record<string, unknown>) => ({
      from: () => ({
        where: (where: unknown) => {
          if ("value" in selection) {
            capturedCountWhere = where;
            return countSelect();
          }
          capturedAggregateWhere = where;
          return { groupBy: () => aggregateSelect() };
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
  capturedAggregateWhere = undefined;
  findFirst.mockClear();
  findMany.mockClear();
  countSelect.mockClear();
  aggregateSelect.mockReset();
  aggregateSelect.mockImplementation(async () => []);
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
    expect(aggregateSelect).not.toHaveBeenCalled();
  });

  test("batches partial scan summaries without an N+1 query", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    findMany.mockImplementationOnce(async (args: FindManyArgs) => {
      capturedFindManyArgs = args;
      return [
        {
          id: "scan-1",
          projectId: "project",
          status: "running",
          plan: {
            totalChecks: 3,
            promptCount: 3,
            sequenceCount: 0,
            engines: ["zeta", "alpha"],
            languages: ["English"],
            tasks: [
              {
                key: "a",
                promptId: "p1",
                prompt: "One",
                engine: "alpha",
                language: "English",
              },
              {
                key: "b",
                promptId: "p2",
                prompt: "Two",
                engine: "zeta",
                language: "English",
              },
              {
                key: "c",
                promptId: "p3",
                prompt: "Three",
                engine: "zeta",
                language: "English",
              },
            ],
            taskStates: { c: "failed" },
          },
          errorCode: "should_not_leak",
          errorMessage: "should not leak",
          failedStage: "execution",
          retryable: true,
          startedAt: now,
          finishedAt: null,
          createdAt: now,
        },
        {
          id: "scan-2",
          projectId: "project",
          status: "completed",
          plan: null,
          errorCode: null,
          errorMessage: null,
          failedStage: null,
          retryable: null,
          startedAt: now,
          finishedAt: now,
          createdAt: now,
        },
      ];
    });
    aggregateSelect.mockImplementationOnce(async () => [
      { scanId: "scan-1", engine: "zeta", completedChecks: 1, mentionCount: 1 },
      {
        scanId: "scan-2",
        engine: "legacy",
        completedChecks: 2,
        mentionCount: 0,
      },
    ]);

    const outcome = await Effect.runPromise(
      listGeoScansForProject({
        organizationId: "org",
        projectId: "project",
        limit: 20,
        page: 1,
      })
    );

    expect(aggregateSelect).toHaveBeenCalledTimes(1);
    expectTenantScopedWhere(capturedAggregateWhere);
    expect(outcome.scans[0]).toMatchObject({
      errorCode: null,
      errorMessage: null,
      failedStage: null,
      retryable: null,
      summary: {
        plannedChecks: 3,
        completedChecks: 1,
        mentionCount: 1,
        failedChecks: 1,
        engines: [
          {
            engine: "alpha",
            plannedChecks: 1,
            completedChecks: 0,
            mentionCount: 0,
            failedChecks: 0,
          },
          {
            engine: "zeta",
            plannedChecks: 2,
            completedChecks: 1,
            mentionCount: 1,
            failedChecks: 1,
          },
        ],
      },
    });
    expect(outcome.scans[1]?.summary).toEqual({
      plannedChecks: null,
      completedChecks: 2,
      mentionCount: 0,
      failedChecks: 0,
      engines: [
        {
          engine: "legacy",
          plannedChecks: null,
          completedChecks: 2,
          mentionCount: 0,
          failedChecks: 0,
        },
      ],
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
    expect(capturedFindFirstArgs).toBeDefined();
    const values = collectBoundValues(capturedFindFirstArgs?.where);
    expect(values).toContain("missing");
    expectTenantScopedWhere(capturedFindFirstArgs?.where);
    expect(aggregateSelect).not.toHaveBeenCalled();
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
        plan: null,
        errorCode: null,
        errorMessage: null,
        failedStage: null,
        retryable: null,
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
      summary: {
        plannedChecks: null,
        completedChecks: 0,
        mentionCount: 0,
        failedChecks: 0,
        engines: [],
      },
      errorCode: null,
      errorMessage: null,
      failedStage: null,
      retryable: null,
    });
    expect(aggregateSelect).toHaveBeenCalledTimes(1);
    expectTenantScopedWhere(capturedAggregateWhere);
    expectTenantScopedWhere(capturedFindFirstArgs?.where);
    expect(collectBoundValues(capturedFindFirstArgs?.where)).toContain(
      "scan-1"
    );
  });

  test("derives exact totals for a large multi-engine plan", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const engineIds = Array.from(
      { length: 64 },
      (_, index) => `engine-${index.toString().padStart(3, "0")}`
    );
    const taskStates: Record<string, "failed"> = {};
    const tasks = engineIds.flatMap((engine, engineIndex) =>
      Array.from({ length: 64 }, (_, taskIndex) => {
        const key = `${engine}-${taskIndex}`;
        if (taskIndex % 10 === 0) {
          taskStates[key] = "failed";
        }
        return {
          key,
          promptId: `prompt-${taskIndex}`,
          prompt: `Prompt ${engineIndex}-${taskIndex}`,
          engine,
          language: "English",
        };
      })
    );
    findFirst.mockImplementationOnce(async () => ({
      id: "scan-large",
      projectId: "project",
      status: "running",
      plan: {
        totalChecks: tasks.length,
        promptCount: 64,
        sequenceCount: 0,
        engines: [...engineIds].reverse(),
        languages: ["English"],
        tasks,
        taskStates,
      },
      errorCode: null,
      errorMessage: null,
      failedStage: null,
      retryable: null,
      startedAt: now,
      finishedAt: null,
      createdAt: now,
    }));
    aggregateSelect.mockImplementationOnce(async () =>
      engineIds.map((engine, index) => ({
        scanId: "scan-large",
        engine,
        completedChecks: index + 1,
        mentionCount: Math.floor((index + 1) / 2),
      }))
    );

    const outcome = await Effect.runPromise(
      getGeoScanForProject({
        organizationId: "org",
        projectId: "project",
        scanId: "scan-large",
      })
    );

    expect(outcome.scan.summary).toMatchObject({
      plannedChecks: 4096,
      completedChecks: 2080,
      mentionCount: 1024,
      failedChecks: 448,
    });
    expect(outcome.scan.summary.engines.map(({ engine }) => engine)).toEqual(
      engineIds
    );
    expect(outcome.scan.summary.engines).toHaveLength(64);
    for (const [index, engine] of outcome.scan.summary.engines.entries()) {
      expect(engine).toEqual({
        engine: engineIds[index],
        plannedChecks: 64,
        completedChecks: index + 1,
        mentionCount: Math.floor((index + 1) / 2),
        failedChecks: 7,
      });
    }
  });

  test("returns stored safe failure metadata", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    findFirst.mockImplementationOnce(async () => ({
      id: "scan-failed",
      projectId: "project",
      status: "failed",
      plan: null,
      errorCode: "geo_scan_error",
      errorMessage: "Failed to store GEO checks",
      failedStage: "execution",
      retryable: null,
      startedAt: now,
      finishedAt: now,
      createdAt: now,
    }));

    const outcome = await Effect.runPromise(
      getGeoScanForProject({
        organizationId: "org",
        projectId: "project",
        scanId: "scan-failed",
      })
    );

    expect(outcome.scan).toMatchObject({
      errorCode: "geo_scan_error",
      errorMessage: "Failed to store GEO checks",
      failedStage: "execution",
      retryable: null,
    });
  });
});
