import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_IRIS_BATCH_WORKER !== "1") {
  test("isolated Iris SQL batching regressions", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          TMPDIR: process.env.TMPDIR,
          NODE_ENV: "test",
          NOTRA_IRIS_BATCH_WORKER: "1",
        },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 35_000);
} else {
  globalThis.fetch = mock(() => {
    throw new Error("External network is forbidden");
  });
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { pgTable, text, jsonb, timestamp } =
    await import("drizzle-orm/pg-core");
  const { Effect } = await import("effect");
  const autonomySignals = pgTable("autonomy_signals", {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    source: text("source").notNull(),
    sourceEventId: text("source_event_id"),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    dedupeHash: text("dedupe_hash").notNull(),
    status: text("status").notNull(),
    occurredAt: timestamp("occurred_at").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  });
  const client = new PGlite();
  const queries: string[] = [];
  let loseCommitAcknowledgement = false;
  let transactions = 0;
  const orm = drizzle(client, {
    schema: { autonomySignals },
    logger: {
      logQuery(query) {
        queries.push(query);
      },
    },
  });
  const db = new Proxy(orm, {
    get(target, key, receiver) {
      if (key === "transaction") {
        return async (run: Parameters<typeof orm.transaction>[0]) => {
          transactions += 1;
          const result = await target.transaction(run);
          if (loseCommitAcknowledgement) {
            throw new Error("ambiguous commit acknowledgement");
          }
          return result;
        };
      }
      const value = Reflect.get(target, key, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  mock.module("@notra/db/drizzle", () => ({ db }));
  mock.module("@notra/db/schema", () => ({ autonomySignals }));
  await client.exec(`create table autonomy_signals (
    id text primary key, organization_id text not null, source text not null, source_event_id text,
    kind text not null check (kind <> 'reject'), payload jsonb not null, dedupe_hash text not null,
    status text not null, occurred_at timestamp not null, created_at timestamp not null, updated_at timestamp not null,
    unique(organization_id, dedupe_hash));`);
  const { recordSignal, recordSignals } = await import("./signals");
  const item = (index: number) => ({
    source: "github",
    kind: "demo",
    sourceEventId: `event-${index}`,
    occurredAt: new Date("2026-01-01T00:00:00Z"),
    payload: { index },
    dedupeHash: `hash-${index}`,
  });
  const persisted = async () =>
    (
      await client.query<Record<string, unknown>>(
        "select organization_id, dedupe_hash, payload, status from autonomy_signals order by organization_id, dedupe_hash"
      )
    ).rows;
  beforeEach(async () => {
    await client.exec("truncate autonomy_signals");
    queries.length = 0;
    transactions = 0;
    loseCommitAcknowledgement = false;
  });
  afterAll(async () => client.close());
  test("200 fresh signals: same rows/counts, 200 -> 2 data statements plus two transactions", async () => {
    const signals = Array.from({ length: 200 }, (_, i) => item(i));
    for (const signal of signals) {
      await Effect.runPromise(
        recordSignal({ ...signal, organizationId: "demo-org" })
      );
    }
    const original = await persisted();
    expect(queries).toHaveLength(200);
    await client.exec("truncate autonomy_signals");
    queries.length = 0;
    const results = await Effect.runPromise(
      recordSignals({ organizationId: "demo-org", signals })
    );
    expect(await persisted()).toEqual(original);
    expect(results.filter((r) => !r.deduplicated)).toHaveLength(200);
    expect(queries).toHaveLength(2);
    expect(transactions).toBe(2);
    queries.length = 0;
    transactions = 0;
    const repeated = await Effect.runPromise(
      recordSignals({ organizationId: "demo-org", signals })
    );
    expect(repeated.every((r) => r.deduplicated)).toBe(true);
    expect(repeated.map((r) => r.signalId)).toEqual(
      results.map((r) => r.signalId)
    );
    expect(queries).toHaveLength(4);
    expect(transactions).toBe(2);
    console.log(
      "Iris fixture: fresh 200 -> 2 data statements; duplicate 400 -> 4; plus two transactions per batch run"
    );
  });
  test("duplicates within/across chunks retain first payload and one original ID", async () => {
    const signals = Array.from({ length: 230 }, (_, i) => ({
      ...item(i % 23),
      payload: { occurrence: i },
    }));
    const results = await Effect.runPromise(
      recordSignals({ organizationId: "demo-org", signals })
    );
    expect(results.filter((r) => !r.deduplicated)).toHaveLength(23);
    for (let index = 23; index < results.length; index++) {
      expect(results[index]?.signalId).toBe(results[index % 23]?.signalId);
    }
    const records = await persisted();
    expect(records).toHaveLength(23);
    expect(
      records.every(
        (row) => (row.payload as { occurrence: number }).occurrence < 23
      )
    ).toBe(true);
  });
  test("empty input performs no SQL; singleton retains serial behavior", async () => {
    expect(
      await Effect.runPromise(
        recordSignals({ organizationId: "demo-org", signals: [] })
      )
    ).toEqual([]);
    expect(queries).toHaveLength(0);
    await Effect.runPromise(
      recordSignals({ organizationId: "demo-org", signals: [item(0)] })
    );
    expect(queries).toHaveLength(1);
  });
  test("a malformed duplicate is not silently dropped before DB validation", async () => {
    const signals = [item(0), { ...item(0), kind: "reject" }, item(1)];
    const original = await Effect.runPromiseExit(
      Effect.forEach(
        signals,
        (signal) => recordSignal({ ...signal, organizationId: "demo-org" }),
        { concurrency: 1 }
      )
    );
    const expected = await persisted();
    expect(original._tag).toBe("Failure");
    await client.exec("truncate autonomy_signals");
    const changed = await Effect.runPromiseExit(
      recordSignals({ organizationId: "demo-org", signals })
    );
    expect(changed._tag).toBe("Failure");
    expect(await persisted()).toEqual(expected);
  });
  test("hashes and conflicting input fields never cross organizations", async () => {
    const signals = [
      item(0),
      Object.assign(item(1), { organizationId: "untrusted-org" }),
    ];
    const first = await Effect.runPromise(
      recordSignals({ organizationId: "org-A", signals })
    );
    const second = await Effect.runPromise(
      recordSignals({ organizationId: "org-B", signals })
    );
    expect(second.every((r) => !r.deduplicated)).toBe(true);
    expect(second[0]?.signalId).not.toBe(first[0]?.signalId);
    expect(
      new Set((await persisted()).map((row) => row.organization_id))
    ).toEqual(new Set(["org-A", "org-B"]));
  });
  for (const failureIndex of [0, 1, 17, 99, 100, 115, 199]) {
    test(`failed item ${failureIndex} preserves the serial committed prefix`, async () => {
      const signals = Array.from({ length: 200 }, (_, i) => ({
        ...item(i),
        kind: i === failureIndex ? "reject" : "demo",
      }));
      const original = await Effect.runPromiseExit(
        Effect.forEach(
          signals,
          (signal) => recordSignal({ ...signal, organizationId: "demo-org" }),
          { concurrency: 1 }
        )
      );
      const expected = await persisted();
      expect(original._tag).toBe("Failure");
      await client.exec("truncate autonomy_signals");
      const changed = await Effect.runPromiseExit(
        recordSignals({ organizationId: "demo-org", signals })
      );
      expect(changed._tag).toBe("Failure");
      expect(await persisted()).toEqual(expected);
      expect(expected).toHaveLength(failureIndex);
    });
  }
  test("ambiguous commit failure stays visible and is not replayed", async () => {
    loseCommitAcknowledgement = true;
    const result = await Effect.runPromiseExit(
      recordSignals({ organizationId: "demo-org", signals: [item(0), item(1)] })
    );
    expect(result._tag).toBe("Failure");
    expect(await persisted()).toHaveLength(2);
    expect(queries.filter((q) => q.startsWith("insert"))).toHaveLength(1);
  });
}
