import { beforeEach, expect, mock, test } from "bun:test";

import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  DEMO_MAX_ACTIVE_SANDBOXES,
  DEMO_SANDBOX_MAX_AGE_MS,
  DEMO_SESSION_COOKIE_MAX_AGE_SECONDS,
} from "../../src/constants/demo";
import { demoPoolSize } from "../../src/utils/demo-limits";

let total = 300;
const afterResponse = mock((_task: () => unknown) => {});
const findMany = mock(async (input = { where: sql``, limit: 0 }) => {
  const where = new PgDialect().sqlToQuery(input.where).sql;
  if (!where.includes("not like")) {
    return [];
  }
  return Array.from({ length: input.limit }, (_, index) => ({
    organizationId: `old-workspace-${index}`,
    apiKeyId: null,
  }));
});
const deleteOrganization = mock(async () => {
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
              { value: where.includes(" like ") ? 3 : total },
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
  total = 300;
  afterResponse.mockClear();
  deleteOrganization.mockClear();
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
  expect(deleteOrganization).toHaveBeenCalledTimes(250);
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
