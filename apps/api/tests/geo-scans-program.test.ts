import { beforeEach, describe, expect, mock, test } from "bun:test";

import { Effect } from "effect";

type FindManyArgs = {
  where: unknown;
  columns: Record<string, boolean>;
  extras: Record<string, unknown>;
  limit: number;
  offset: number;
};

let capturedFindManyArgs: FindManyArgs | undefined;
let capturedFindFirstArgs:
  | {
      where: unknown;
      columns: Record<string, boolean>;
      extras: Record<string, unknown>;
    }
  | undefined;
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

  if ("sql" in fragment) {
    return collectSqlText((fragment as { sql: unknown }).sql);
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

const findFirst = mock(
  async (args: NonNullable<typeof capturedFindFirstArgs>) => {
    capturedFindFirstArgs = args;
    return null;
  }
);
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
  findFirst.mockClear();
  findMany.mockClear();
  countSelect.mockClear();
  aggregateSelect.mockReset();
  aggregateSelect.mockImplementation(async () => []);
  findFirst.mockImplementation(
    async (args: NonNullable<typeof capturedFindFirstArgs>) => {
      capturedFindFirstArgs = args;
      return null;
    }
  );
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
    expect(capturedFindManyArgs?.columns).not.toHaveProperty("plan");
    expect(collectSqlText(capturedFindManyArgs?.extras.planSummary)).toContain(
      "jsonb_array_elements"
    );
    expectTenantScopedWhere(capturedFindManyArgs?.where);
    expectTenantScopedWhere(capturedCountWhere);
    expect(aggregateSelect).not.toHaveBeenCalled();
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
});
