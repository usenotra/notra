import { afterAll, beforeEach, expect, mock, test } from "bun:test";

import { type SQL, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  DEMO_MAX_ACTIVE_SANDBOXES,
  DEMO_SANDBOX_MAX_AGE_MS,
  DEMO_SESSION_COOKIE_MAX_AGE_SECONDS,
} from "../../src/constants/demo";
import { demoPoolSize } from "../../src/utils/demo-limits";

const originalPoolSize = process.env.NOTRA_DEMO_POOL_SIZE;
let total = 300;
let pooled = 3;
const afterResponse = mock((_task: () => unknown) => {});
const findMany = mock(
  async (input = { where: sql``, limit: 0, orderBy: [sql``] }) => {
    const dialect = new PgDialect();
    const where = dialect.sqlToQuery(input.where).sql;
    if (!(input.limit > 0 && where.includes("like"))) {
      return [];
    }
    const visitors = where.includes("not like");
    expect(
      (input.orderBy ?? []).map((order: SQL) => dialect.sqlToQuery(order).sql)
    ).toEqual([
      visitors
        ? '"demo_sandboxes"."last_seen_at" asc'
        : '"demo_sandboxes"."created_at" asc',
    ]);
    return Array.from(
      { length: Math.min(input.limit, visitors ? total - pooled : pooled) },
      (_, index) => ({
        organizationId: `${visitors ? "visitor" : "pool"}-workspace-${index}`,
        apiKeyId: null,
      })
    );
  }
);
const deleteOrganization = mock(async (condition = sql``) => {
  const [organizationId] = new PgDialect().sqlToQuery(condition).params;
  if (
    typeof organizationId === "string" &&
    organizationId.startsWith("pool-")
  ) {
    pooled -= 1;
  }
  total -= 1;
});

mock.module("@notra/db/drizzle", () => ({
  db: {
    select: (selection = {}) => ({
      from: () => ({
        where: (condition = sql``) => {
          if (Object.hasOwn(selection, "value")) {
            const where = new PgDialect().sqlToQuery(condition).sql;
            return Promise.resolve([
              { value: where.includes(" like ") ? pooled : total },
            ]);
          }
          if (Object.hasOwn(selection, "userId")) {
            return Promise.resolve([]);
          }
          return { limit: async () => [] };
        },
      }),
    }),
    delete: () => ({ where: deleteOrganization }),
    query: { demoSandboxes: { findMany } },
  },
}));
// A full pool makes refill exit without seeding. No external service is used.
mock.module("@notra/ai/utils/redis", () => ({ redis: null }));
mock.module("@notra/ai/utils/server-log", () => ({ logError: mock() }));
mock.module("@/lib/demo/api-key", () => ({
  createDemoApiKey: mock(),
  deleteDemoApiKey: mock(),
  updateDemoApiKey: mock(),
}));
mock.module("@/lib/demo/database-guard", () => ({
  assertDedicatedDemoDatabase: mock(),
}));
mock.module("@/lib/demo/rebase", () => ({
  rebaseDemoSandbox: mock(),
  shouldRebaseDemoSandbox: mock(),
}));
mock.module("@/lib/demo/seed/workspace", () => ({ seedDemoWorkspace: mock() }));
mock.module("@/lib/framework/after-response", () => ({ afterResponse }));

const { maintainDemoSandboxPool } = await import("../../src/lib/demo/sandbox");

beforeEach(() => {
  process.env.NOTRA_DEMO_POOL_SIZE = "3";
  total = 300;
  pooled = 3;
  afterResponse.mockClear();
  findMany.mockClear();
  deleteOrganization.mockClear();
});

afterAll(() => {
  if (originalPoolSize === undefined) {
    delete process.env.NOTRA_DEMO_POOL_SIZE;
  } else {
    process.env.NOTRA_DEMO_POOL_SIZE = originalPoolSize;
  }
});

test("trims existing workspaces to the fixed cap without needing a refill", async () => {
  maintainDemoSandboxPool();
  const [task] = afterResponse.mock.calls[0] ?? [];
  if (!task) {
    throw new Error("Expected pool maintenance after the response");
  }
  await task();
  expect(DEMO_MAX_ACTIVE_SANDBOXES).toBe(50);
  expect(total).toBe(50);
  expect(pooled).toBe(3);
  expect(deleteOrganization).toHaveBeenCalledTimes(250);
});

test.each([59, 60])(
  "shrinks %i old ready workspaces without evicting a newly claimed visitor",
  async (readyCount) => {
    pooled = readyCount;
    total = pooled + 1;
    maintainDemoSandboxPool();
    await afterResponse.mock.calls[0]?.[0]();
    expect(total).toBe(DEMO_MAX_ACTIVE_SANDBOXES);
    expect(pooled).toBe(DEMO_MAX_ACTIVE_SANDBOXES - 1);
    expect(
      deleteOrganization.mock.calls.every(([condition]) => {
        const [organizationId] = new PgDialect().sqlToQuery(condition).params;
        return (
          typeof organizationId === "string" &&
          organizationId.startsWith("pool-")
        );
      })
    ).toBe(true);
  }
);

test("removes excess ready workspaces before the oldest visitors while keeping the configured reserve", async () => {
  pooled = 10;
  total = 70;
  maintainDemoSandboxPool();
  await afterResponse.mock.calls[0]?.[0]();
  expect(total).toBe(DEMO_MAX_ACTIVE_SANDBOXES);
  expect(pooled).toBe(3);
  const deleted = deleteOrganization.mock.calls.map(
    ([condition]) => new PgDialect().sqlToQuery(condition).params[0]
  );
  expect(deleted.slice(0, 7)).toEqual(
    Array.from({ length: 7 }, (_, index) => `pool-workspace-${index}`)
  );
  expect(deleted.slice(7)).toEqual(
    Array.from({ length: 13 }, (_, index) => `visitor-workspace-${index}`)
  );
});

test("maintenance keeps all workspaces when already at the cap", async () => {
  total = DEMO_MAX_ACTIVE_SANDBOXES;
  maintainDemoSandboxPool();
  await afterResponse.mock.calls[0]?.[0]();
  expect(deleteOrganization).not.toHaveBeenCalled();
});

test("the database lifetime and session cookie are both six hours", () => {
  expect(DEMO_SANDBOX_MAX_AGE_MS).toBe(6 * 60 * 60 * 1000);
  expect(DEMO_SESSION_COOKIE_MAX_AGE_SECONDS).toBe(6 * 60 * 60);
});

test("an oversized pool cannot consume the entire workspace budget", () => {
  const previous = process.env.NOTRA_DEMO_POOL_SIZE;
  try {
    process.env.NOTRA_DEMO_POOL_SIZE = "1000";
    expect(demoPoolSize()).toBe(DEMO_MAX_ACTIVE_SANDBOXES - 1);
  } finally {
    if (previous === undefined) {
      delete process.env.NOTRA_DEMO_POOL_SIZE;
    } else {
      process.env.NOTRA_DEMO_POOL_SIZE = previous;
    }
  }
});
