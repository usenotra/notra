import { afterAll, beforeEach, expect, mock, test } from "bun:test";

import { DEMO_SEEDING_GRACE_MINUTES } from "@notra/db/constants/demo";
import { demoSandboxes } from "@notra/db/schema";
import { type SQL, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  DEMO_MAX_ACTIVE_SANDBOXES,
  DEMO_SANDBOX_MAX_AGE_MS,
  DEMO_SESSION_COOKIE_MAX_AGE_SECONDS,
  DEMO_SEED_ID_PREFIX,
  DEMO_STORAGE_LOCK_KEY,
} from "../../src/constants/demo";
import { demoPoolSize } from "../../src/utils/demo-limits";

const originalPoolSize = process.env.NOTRA_DEMO_POOL_SIZE;
let total = 300;
let pooled = 3;
let lockedPoolRows = 0;
let transactionActive = false;
let activeTransactions = 0;
let reservationLocked = false;
let poolApiKeys = false;
const reservations = new Map<
  string,
  { organizationId: string; createdAt?: Date }
>();
const seedDemoWorkspace = mock(async () => {
  expect(transactionActive).toBe(false);
  expect(reservations.size).toBeGreaterThan(0);
});
const deleteDemoApiKey = mock(async () => {
  expect(transactionActive).toBe(false);
});
const afterResponse = mock((_task: () => unknown) => {});
const findMany = mock(
  async (input = { where: sql``, limit: 0, orderBy: [sql``] }) => {
    const dialect = new PgDialect();
    const where = dialect.sqlToQuery(input.where).sql;
    if (!(input.limit > 0 && where.includes("like"))) {
      return [];
    }
    const visitors = where.includes("not like");
    if (visitors) {
      expect(dialect.sqlToQuery(input.where).params).toContain(
        `${DEMO_SEED_ID_PREFIX}%`
      );
    }
    expect(
      (input.orderBy ?? []).map((order: SQL) => dialect.sqlToQuery(order).sql)
    ).toEqual([
      visitors
        ? '"demo_sandboxes"."last_seen_at" asc'
        : '"demo_sandboxes"."created_at" asc',
    ]);
    return Array.from(
      {
        length: Math.min(
          input.limit,
          visitors ? total - pooled - reservations.size : pooled
        ),
      },
      (_, index) => ({
        organizationId: `${visitors ? "visitor" : "pool"}-workspace-${index}`,
        apiKeyId: !visitors && poolApiKeys ? `pool-key-${index}` : null,
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
  for (const [id, reservation] of reservations) {
    if (reservation.organizationId === organizationId) {
      reservations.delete(id);
    }
  }
});

const transaction = mock(async (work: (tx: unknown) => Promise<unknown>) => {
  activeTransactions += 1;
  transactionActive = true;
  let ownsReservationLock = false;
  try {
    return await work({
      execute: async (query: SQL) => {
        const compiled = new PgDialect().sqlToQuery(query);
        expect(compiled.sql).toContain("pg_try_advisory_xact_lock");
        expect(compiled.params).toEqual([DEMO_STORAGE_LOCK_KEY]);
        ownsReservationLock = !reservationLocked;
        if (ownsReservationLock) {
          reservationLocked = true;
        }
        return { rows: [{ locked: ownsReservationLock }] };
      },
      insert: (table: unknown) => ({
        values: async (input: {
          anonymousId: string;
          organizationId: string;
          expiresAt: Date;
          createdAt: Date;
        }) => {
          expect(ownsReservationLock).toBe(true);
          if (table === demoSandboxes) {
            expect(input.expiresAt.getTime() - input.createdAt.getTime()).toBe(
              DEMO_SEEDING_GRACE_MINUTES * 60_000
            );
            expect(input.anonymousId.startsWith(DEMO_SEED_ID_PREFIX)).toBe(
              true
            );
            expect(total).toBeLessThan(DEMO_MAX_ACTIVE_SANDBOXES);
            reservations.set(input.anonymousId, {
              organizationId: input.organizationId,
              createdAt: input.createdAt,
            });
            total += 1;
          }
        },
      }),
      select: (selection = {}) => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: () => ({ limit: () => ({ for: async () => [] }) }),
            }),
          }),
          where: (where = sql``) => {
            if (Object.hasOwn(selection, "value")) {
              return Promise.resolve([{ value: total }]);
            }
            if (Object.hasOwn(selection, "userId")) {
              expect(transactionActive).toBe(true);
              return Promise.resolve([]);
            }
            return {
              orderBy: (...orderBy: SQL[]) => ({
                limit: (limit: number) => ({
                  for: async (strength: string, options: unknown) => {
                    expect(transactionActive).toBe(true);
                    expect(strength).toBe("update");
                    expect(options).toEqual({
                      of: demoSandboxes,
                      skipLocked: true,
                    });
                    return findMany({
                      where,
                      orderBy,
                      limit: Math.min(limit, pooled - lockedPoolRows),
                    });
                  },
                }),
              }),
            };
          },
        }),
      }),
      delete: () => ({
        where: (condition = sql``) => {
          expect(transactionActive).toBe(true);
          return deleteOrganization(condition);
        },
      }),
    });
  } finally {
    if (ownsReservationLock) {
      reservationLocked = false;
    }
    activeTransactions -= 1;
    transactionActive = activeTransactions > 0;
  }
});

mock.module("@notra/db/drizzle", () => ({
  db: {
    transaction,
    update: () => ({
      set: (input: { anonymousId: string; expiresAt: Date }) => ({
        where: (condition: SQL) => ({
          returning: async () => {
            const [reservedId] = new PgDialect().sqlToQuery(condition).params;
            expect(reservations.has(String(reservedId))).toBe(true);
            expect(input.anonymousId.startsWith(DEMO_SEED_ID_PREFIX)).toBe(
              false
            );
            expect(
              input.expiresAt.getTime() -
                (reservations.get(String(reservedId))?.createdAt?.getTime() ??
                  0)
            ).toBe(DEMO_SANDBOX_MAX_AGE_MS);
            reservations.delete(String(reservedId));
            return [{ anonymousId: input.anonymousId }];
          },
        }),
      }),
    }),
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
    delete: () => ({
      where: (condition = sql``) => {
        const [organizationId] = new PgDialect().sqlToQuery(condition).params;
        expect(String(organizationId).startsWith("pool-")).toBe(false);
        return deleteOrganization(condition);
      },
    }),
    query: { demoSandboxes: { findMany } },
  },
}));
// A full pool makes refill exit without seeding. No external service is used.
mock.module("@notra/ai/utils/redis", () => ({ redis: null }));
mock.module("@notra/ai/utils/server-log", () => ({ logError: mock() }));
mock.module("@/lib/demo/api-key", () => ({
  createDemoApiKey: mock(async () => null),
  deleteDemoApiKey,
  updateDemoApiKey: mock(),
}));
mock.module("@/lib/demo/database-guard", () => ({
  assertDedicatedDemoDatabase: mock(),
}));
mock.module("@/lib/demo/rebase", () => ({
  rebaseDemoSandbox: mock(),
  shouldRebaseDemoSandbox: mock(),
}));
mock.module("@/lib/demo/seed/workspace", () => ({ seedDemoWorkspace }));
mock.module("@/lib/framework/after-response", () => ({ afterResponse }));

const { maintainDemoSandboxPool, createDemoSandbox } =
  await import("../../src/lib/demo/sandbox");

beforeEach(() => {
  process.env.NOTRA_DEMO_POOL_SIZE = "3";
  total = 300;
  pooled = 3;
  lockedPoolRows = 0;
  transactionActive = false;
  activeTransactions = 0;
  reservationLocked = false;
  poolApiKeys = false;
  reservations.clear();
  seedDemoWorkspace.mockClear();
  deleteDemoApiKey.mockClear();
  transaction.mockClear();
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

test("locked ready workspaces defer trimming without evicting the new visitor", async () => {
  pooled = 60;
  total = 61;
  lockedPoolRows = 55;
  maintainDemoSandboxPool();
  await afterResponse.mock.calls[0]?.[0]();
  expect(total).toBe(56);
  expect(pooled).toBe(55);
  expect(deleteOrganization).toHaveBeenCalledTimes(5);
  expect(transaction).toHaveBeenCalledTimes(1);

  lockedPoolRows = 0;
  maintainDemoSandboxPool();
  await afterResponse.mock.calls[1]?.[0]();
  expect(total).toBe(DEMO_MAX_ACTIVE_SANDBOXES);
  expect(pooled).toBe(DEMO_MAX_ACTIVE_SANDBOXES - 1);
});

test("maintenance keeps all workspaces when already at the cap", async () => {
  total = DEMO_MAX_ACTIVE_SANDBOXES;
  maintainDemoSandboxPool();
  await afterResponse.mock.calls[0]?.[0]();
  expect(deleteOrganization).not.toHaveBeenCalled();
});

test("external pool keys are deleted only after the database transaction commits", async () => {
  total = 61;
  pooled = 60;
  poolApiKeys = true;
  maintainDemoSandboxPool();
  await afterResponse.mock.calls[0]?.[0]();
  expect(total).toBe(DEMO_MAX_ACTIVE_SANDBOXES);
  expect(deleteDemoApiKey).toHaveBeenCalledTimes(11);
});

test("parallel no-pool creation reserves the last slot before seeding", async () => {
  total = 49;
  pooled = 0;
  const created = await Promise.all(
    Array.from({ length: 10 }, () =>
      createDemoSandbox({ timeZone: "UTC", ipHash: null })
    )
  );
  expect(created.filter(Boolean)).toHaveLength(1);
  expect(total).toBe(DEMO_MAX_ACTIVE_SANDBOXES);
  expect(reservations.size).toBe(0);
  expect(seedDemoWorkspace).toHaveBeenCalledTimes(1);
  expect(reservationLocked).toBe(false);
});

test("in-flight seeds cannot be evicted to make room for another seed", async () => {
  total = 50;
  pooled = 0;
  for (let index = 0; index < 50; index += 1) {
    reservations.set(`seed_${index}`, { organizationId: `pending-${index}` });
  }
  expect(await createDemoSandbox({ timeZone: null, ipHash: null })).toBeNull();
  expect(total).toBe(DEMO_MAX_ACTIVE_SANDBOXES);
  expect(deleteOrganization).not.toHaveBeenCalled();
  expect(seedDemoWorkspace).not.toHaveBeenCalled();
});

test("failed seeding releases the reservation and allows a retry", async () => {
  total = 49;
  pooled = 0;
  seedDemoWorkspace.mockRejectedValueOnce(new Error("seed failed"));
  await expect(
    createDemoSandbox({ timeZone: null, ipHash: null })
  ).rejects.toThrow("seed failed");
  expect(total).toBe(49);
  expect(reservations.size).toBe(0);
  expect(reservationLocked).toBe(false);
  expect(
    await createDemoSandbox({ timeZone: null, ipHash: null })
  ).not.toBeNull();
  expect(total).toBe(DEMO_MAX_ACTIVE_SANDBOXES);
});

test("busy capacity responds with Retry-After without issuing a session", async () => {
  total = DEMO_MAX_ACTIVE_SANDBOXES;
  pooled = 0;
  for (let index = 0; index < total; index += 1) {
    reservations.set(`seed_${index}`, { organizationId: `pending-${index}` });
  }
  const writeDemoSession = mock();
  mock.module("@notra/utils/demo-mode", () => ({ isDemoMode: () => true }));
  mock.module("@tanstack/react-start/server", () => ({
    getRequestHeaders: async () => new Headers(),
  }));
  mock.module("@/lib/demo/session", () => ({ writeDemoSession }));
  mock.module("@/utils/demo-ip-hash", () => ({
    getDemoClientIp: () => "127.0.0.1",
    hashDemoClientIp: () => "test-ip",
  }));
  mock.module("@/utils/ratelimit", () => ({
    ratelimit: {
      demoSandboxCreate: { limit: async () => ({ success: true }) },
    },
  }));
  const { POST } = await import("../../src/app/api/demo/sandbox/route");
  const response = await POST(
    new Request("http://localhost/api/demo/sandbox", {
      method: "POST",
      body: "{}",
    })
  );
  expect(response.status).toBe(503);
  expect(response.headers.get("Retry-After")).toBe("3");
  expect(writeDemoSession).not.toHaveBeenCalled();
  expect(afterResponse).not.toHaveBeenCalled();
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
