import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { sql as drizzleSql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { Effect, Layer, Redacted, Schema } from "effect";

import {
  createWebhookRequestSchema,
  webhookEventTypeSchema,
} from "../../schemas/src/schemas/api/webhooks";
import { publishEventInTransaction } from "../src/drizzle";
import { WebhookStorageError } from "../src/errors/webhooks";
import { deliver } from "../src/programs/deliveries";
import { createEndpoint } from "../src/programs/endpoints";
import { dispatchEvent } from "../src/programs/recovery";
import {
  DeliveryId,
  EventData,
  EventId,
  OrganizationId,
} from "../src/schemas/webhooks";
import { webCryptoLayer } from "../src/services/crypto";
import { WebhookDatabase } from "../src/services/database";
import { WebhookQueues } from "../src/services/queue";
import { WebhookTransport } from "../src/services/transport";
import type { SendRequest } from "../src/types/webhooks";
import { postPublishedInput } from "../src/utils/posts";
import { verifySignature } from "../src/utils/signature";
import { POST_FIELD_UPDATES } from "./fixtures/constants/post-fields";
import { WEBHOOK_EVENT_FIXTURES } from "./fixtures/constants/webhook-events";
import type {
  LifecycleDeliveryRow,
  LifecycleEventRow,
} from "./fixtures/types/lifecycle";

const db = new PGlite();
const sql = <T = Record<string, unknown>>(
  query: string,
  parameters: readonly unknown[] = []
) =>
  Effect.tryPromise({
    try: () => db.query<T>(query, [...parameters]),
    catch: (cause) =>
      new WebhookStorageError({ operation: "lifecycle.query", cause }),
  });
const org = Schema.decodeUnknownSync(OrganizationId)("org-one");
const sent: SendRequest[] = [];
const queued: string[] = [];
const layers = Layer.mergeAll(
  Layer.succeed(
    WebhookDatabase,
    WebhookDatabase.of({
      query: (query, parameters) =>
        sql(query, parameters).pipe(Effect.map((result) => result.rows)),
    })
  ),
  webCryptoLayer(Redacted.make(btoa("l".repeat(32)))),
  Layer.succeed(
    WebhookTransport,
    WebhookTransport.of({
      send: (request) =>
        Effect.sync(() => {
          sent.push(request);
          return {
            statusCode: 204,
            error: null,
            durationMs: 1,
            retryAfterSeconds: null,
          };
        }),
    })
  ),
  Layer.succeed(
    WebhookQueues,
    WebhookQueues.of({
      event: () => Effect.void,
      delivery: (id) => Effect.sync(() => queued.push(id)),
      deliveries: (ids) => Effect.sync(() => queued.push(...ids)),
    })
  )
);
const insertPost = (id = "post-one", status = "draft") =>
  db.query(
    `INSERT INTO posts (id, organization_id, collection_id, title, content, content_type, status)
     VALUES ($1, 'org-one', 'collection-one', 'Original title', 'Original content', 'blog_post', $2)`,
    [id, status]
  );
const events = async () =>
  (await db.query<LifecycleEventRow>("SELECT * FROM webhook_events")).rows;
const deliveries = async () =>
  (await db.query<LifecycleDeliveryRow>("SELECT * FROM webhook_deliveries"))
    .rows;

beforeAll(async () => {
  await db.exec(
    await readFile(new URL("fixtures/lifecycle.sql", import.meta.url), "utf8")
  );
  for (const migration of [
    "0105_round_cable.sql",
    "0109_webhook_lifecycle.sql",
  ]) {
    await db.exec(
      await readFile(
        new URL(`../../db/migrations/${migration}`, import.meta.url),
        "utf8"
      )
    );
  }
}, 30_000);
beforeEach(async () => {
  await db.exec(`TRUNCATE organizations CASCADE;
    INSERT INTO organizations VALUES ('org-one'), ('org-two');
    INSERT INTO post_collections VALUES ('collection-one', 'org-one'), ('collection-two', 'org-one'), ('collection-other', 'org-two');
    INSERT INTO projects VALUES ('project-one', 'org-one'), ('project-other', 'org-two');`);
  sent.length = 0;
  queued.length = 0;
}, 30_000);
afterAll(() => db.close());

test.each(["draft", "published"])(
  "inserting a %s post records created and only published inserts record published",
  async (status) => {
    await insertPost("post-one", status);
    const rows = await events();
    expect(rows.map((row) => row.event_type).sort()).toEqual(
      status === "published"
        ? ["post.created", "post.published"]
        : ["post.created"]
    );
    for (const row of rows) {
      const payload = JSON.parse(row.payload);
      expect(payload).toEqual({
        id: row.id,
        type: row.event_type,
        apiVersion: "2026-10-06",
        createdAt: expect.any(String),
        organizationId: "org-one",
        data: { postId: "post-one" },
      });
      expect(Date.parse(payload.createdAt)).toBe(row.created_at.getTime());
    }
    expect(await deliveries()).toHaveLength(0);
  }
);

test.each(POST_FIELD_UPDATES)(
  "a persisted change to %s emits updated, while repeating the value is a no-op",
  async (field, value) => {
    await insertPost();
    await db.exec(`UPDATE posts SET ${field} = ${value}`);
    const rows = await events();
    expect(rows.map((row) => row.event_type).sort()).toEqual([
      "post.created",
      "post.updated",
    ]);
    const updated = rows.find((row) => row.event_type === "post.updated");
    expect(updated?.organization_id).toBe(
      field === "organization_id" ? "org-two" : "org-one"
    );
    expect(JSON.parse(updated?.payload ?? "null").data).toEqual({
      postId: field === "id" ? "renamed-post" : "post-one",
    });
    await db.exec(`UPDATE posts SET ${field} = ${value}`);
    expect(await events()).toEqual(rows);
  }
);

test("timestamp-only writes, identical full rows, and reordered JSON keys are no-ops", async () => {
  await insertPost();
  await db.exec(`UPDATE posts SET source_metadata = '{"a":1,"b":2}'::jsonb`);
  const rows = await events();
  await db.exec(`UPDATE posts SET created_at = created_at + interval '1 day';
    UPDATE posts SET updated_at = updated_at + interval '1 day';
    UPDATE posts SET created_at = now(), updated_at = now();
    UPDATE posts SET title = title, content = content, slug = slug, status = status;
    UPDATE posts SET source_metadata = '{"b":2,"a":1}'::jsonb;`);
  expect(await events()).toEqual(rows);
});

test("every publish transition and unpublish emits updated plus lifecycle, without duplicating legacy publication", async () => {
  await insertPost();
  const txDb = drizzle({ client: db });
  const initialId = await txDb.transaction(async (tx) => {
    await tx.execute(drizzleSql`UPDATE posts SET status = 'published'`);
    return publishEventInTransaction(
      tx,
      postPublishedInput({ organizationId: org, postId: "post-one" })
    );
  });
  const initialEvent = (await events()).find((row) => row.id === initialId);
  expect(initialEvent?.source_key).toBe("post:post-one:published");
  for (const cycle of [1, 2]) {
    await db.exec("UPDATE posts SET status = 'draft'");
    const beforeSameDraft = await events();
    await db.exec("UPDATE posts SET status = 'draft'");
    expect(await events()).toEqual(beforeSameDraft);
    await txDb.transaction(async (tx) => {
      await tx.execute(drizzleSql`UPDATE posts SET status = 'published'`);
      const beforeLegacy = await tx.execute(
        drizzleSql`SELECT id, source_key, payload FROM webhook_events WHERE event_type = 'post.published'`
      );
      expect(beforeLegacy.rows).toHaveLength(cycle + 1);
      const id = await publishEventInTransaction(
        tx,
        postPublishedInput({ organizationId: org, postId: "post-one" })
      );
      expect(id).toBe(initialId);
      expect(
        (
          await tx.execute(
            drizzleSql`SELECT id FROM webhook_events WHERE event_type = 'post.published'`
          )
        ).rows
      ).toHaveLength(cycle + 1);
    });
    const published = (await events()).filter(
      (row) => row.event_type === "post.published"
    );
    const initial = published.find((row) => row.id === initialId);
    expect(initial).toEqual(initialEvent);
    expect(new Set(published.map((row) => row.source_key)).size).toBe(
      cycle + 1
    );
    for (const republished of published.filter((row) => row.id !== initialId)) {
      expect(republished.source_key).toStartWith("post:post-one:published:");
    }
    const beforeSameStatus = await events();
    await db.exec("UPDATE posts SET status = 'published', updated_at = now()");
    expect(await events()).toEqual(beforeSameStatus);
  }
  await db.exec("UPDATE posts SET status = 'draft'");
  const rows = await events();
  expect(rows.filter((row) => row.event_type === "post.updated")).toHaveLength(
    6
  );
  expect(
    rows.filter((row) => row.event_type === "post.unpublished")
  ).toHaveLength(3);
  expect(rows).toHaveLength(13);
});

test("a post inserted published also deduplicates the legacy publisher", async () => {
  const txDb = drizzle({ client: db });
  const id = await txDb.transaction(async (tx) => {
    await tx.execute(drizzleSql`INSERT INTO posts (id, organization_id, collection_id, title, content, content_type, status)
      VALUES ('post-one', 'org-one', 'collection-one', 'Title', 'Content', 'blog_post', 'published')`);
    return publishEventInTransaction(
      tx,
      postPublishedInput({ organizationId: org, postId: "post-one" })
    );
  });
  expect(
    (await events()).filter((row) => row.event_type === "post.published")
  ).toEqual([
    expect.objectContaining({ id, source_key: "post:post-one:published" }),
  ]);
});

test.each([
  "DELETE FROM posts",
  "DELETE FROM post_collections WHERE id = 'collection-one'",
])("%s records deleted for every draft and published post", async (query) => {
  await insertPost("draft-post");
  await insertPost("published-post", "published");
  await db.exec(query);
  expect((await db.query("SELECT id FROM posts")).rows).toHaveLength(0);
  const deleted = (await events()).filter(
    (row) => row.event_type === "post.deleted"
  );
  expect(
    deleted.map((row) => JSON.parse(row.payload).data.postId).sort()
  ).toEqual(["draft-post", "published-post"]);
});

test("organization cascades skip lifecycle publication and remove all dependent rows safely", async () => {
  await Effect.runPromise(
    createEndpoint({
      organizationId: org,
      url: "https://hooks.usenotra.com/receive",
      events: ["post.created", "post.deleted"],
    }).pipe(Effect.provide(layers))
  );
  await insertPost();
  await db.exec(`INSERT INTO geo_scans (id, organization_id, project_id) VALUES ('scan-one', 'org-one', 'project-one');
    CREATE FUNCTION reject_lifecycle_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'unexpected lifecycle event'; END; $$;
    CREATE TRIGGER reject_lifecycle_event BEFORE INSERT ON webhook_events FOR EACH ROW EXECUTE FUNCTION reject_lifecycle_event();`);
  try {
    await db.exec("DELETE FROM organizations WHERE id = 'org-one'");
    for (const table of [
      "posts",
      "post_collections",
      "projects",
      "geo_scans",
      "webhook_events",
      "webhook_endpoints",
      "webhook_deliveries",
    ]) {
      expect(
        (
          await db.query(
            `SELECT * FROM ${table} WHERE organization_id = 'org-one'`
          )
        ).rows
      ).toHaveLength(0);
    }
    expect((await db.query("SELECT id FROM organizations")).rows).toEqual([
      { id: "org-two" },
    ]);
  } finally {
    await db.exec(
      "DROP TRIGGER reject_lifecycle_event ON webhook_events; DROP FUNCTION reject_lifecycle_event()"
    );
  }
});

test("fanout snapshots enabled, matching, live endpoints in the owning organization only", async () => {
  await db.exec(`INSERT INTO webhook_endpoints (id, organization_id, url, events, secret, enabled, deleted_at) VALUES
    ('matching', 'org-one', 'https://example.com/matching', ARRAY['post.created','post.updated'], 'snapshot-secret', true, NULL),
    ('disabled', 'org-one', 'https://example.com/disabled', ARRAY['post.created'], 'secret', false, NULL),
    ('deleted', 'org-one', 'https://example.com/deleted', ARRAY['post.created'], 'secret', true, now()),
    ('unmatched', 'org-one', 'https://example.com/unmatched', ARRAY['geo.scan.completed'], 'secret', true, NULL),
    ('other-org', 'org-two', 'https://example.com/other', ARRAY['post.created'], 'secret', true, NULL)`);
  await insertPost();
  const [event] = await events();
  expect(await deliveries()).toEqual([
    expect.objectContaining({
      event_id: event?.id,
      endpoint_id: "matching",
      organization_id: "org-one",
      url: "https://example.com/matching",
      secret: "snapshot-secret",
    }),
  ]);
  await db.exec(`UPDATE webhook_endpoints SET url = 'https://example.com/changed', secret = 'rotated' WHERE id = 'matching';
    INSERT INTO webhook_endpoints (id, organization_id, url, events, secret) VALUES ('new', 'org-one', 'https://example.com/new', ARRAY['post.created','post.updated'], 'secret')`);
  await Effect.runPromise(
    dispatchEvent(Schema.decodeUnknownSync(EventId)(event?.id)).pipe(
      Effect.provide(layers)
    )
  );
  expect(await deliveries()).toHaveLength(1);
  expect((await deliveries())[0]?.url).toBe("https://example.com/matching");
  expect((await deliveries())[0]?.secret).toBe("snapshot-secret");
  await db.exec("UPDATE posts SET title = 'Changed'");
  expect((await deliveries()).map((row) => row.endpoint_id).sort()).toEqual([
    "matching",
    "matching",
    "new",
  ]);
});

test("events without subscribers are retained and dispatch does not backfill a later endpoint", async () => {
  await insertPost();
  const [event] = await events();
  expect(event?.event_type).toBe("post.created");
  expect(await deliveries()).toHaveLength(0);
  await Effect.runPromise(
    createEndpoint({
      organizationId: org,
      url: "https://hooks.usenotra.com/receive",
      events: ["post.created"],
    }).pipe(Effect.provide(layers))
  );
  await Effect.runPromise(
    dispatchEvent(Schema.decodeUnknownSync(EventId)(event?.id)).pipe(
      Effect.provide(layers)
    )
  );
  expect(await deliveries()).toHaveLength(0);
  expect(await events()).toEqual([expect.objectContaining({ id: event?.id })]);
});

test.each(["completed", "failed"])(
  "GEO %s transition captures terminal metadata once, including nullable values",
  async (status) => {
    await db.exec(
      `INSERT INTO geo_scans (id, organization_id, project_id) VALUES ('scan-one', 'org-one', 'project-one')`
    );
    expect(await events()).toHaveLength(0);
    await db.query(
      "UPDATE geo_scans SET status = $1, run_id = 'run-one', checks_total = 12, checks_failed = 2, mentions = 4, duration_ms = 1234, error_code = 'handoff_failed', error_message = 'Dispatch failed', failed_stage = 'handoff', retryable = true, finished_at = now()",
      [status]
    );
    const rows = await events();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source_key).toBe("geo-scan:scan-one:terminal");
    expect(JSON.parse(rows[0]?.payload ?? "null")).toEqual({
      id: rows[0]?.id,
      type: `geo.scan.${status}`,
      apiVersion: "2026-10-06",
      createdAt: expect.any(String),
      organizationId: "org-one",
      data:
        status === "completed"
          ? {
              scanId: "scan-one",
              projectId: "project-one",
              runId: "run-one",
              checksTotal: 12,
              checksFailed: 2,
              mentions: 4,
              durationMs: 1234,
            }
          : {
              scanId: "scan-one",
              projectId: "project-one",
              errorCode: "handoff_failed",
              error: "Dispatch failed",
              failedStage: "handoff",
              retryable: true,
            },
    });
    await db.query("UPDATE geo_scans SET status = $1", [status]);
    await db.exec(
      "UPDATE geo_scans SET checks_total = 99, error_message = 'Later metadata', run_id = NULL"
    );
    await db.query("UPDATE geo_scans SET status = $1", [
      status === "completed" ? "failed" : "completed",
    ]);
    await db.exec("UPDATE geo_scans SET status = 'running'");
    await db.query("UPDATE geo_scans SET status = $1", [status]);
    expect(await events()).toEqual(rows);
  }
);

test.each(["completed", "failed"])(
  "GEO inserted %s emits the terminal event with explicit nulls",
  async (status) => {
    await db.query(
      "INSERT INTO geo_scans (id, organization_id, project_id, status) VALUES ('scan-one', 'org-one', 'project-one', $1)",
      [status]
    );
    const rows = await events();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source_key).toBe("geo-scan:scan-one:terminal");
    expect(JSON.parse(rows[0]?.payload ?? "null").data).toEqual(
      status === "completed"
        ? {
            scanId: "scan-one",
            projectId: "project-one",
            runId: null,
            checksTotal: null,
            checksFailed: null,
            mentions: null,
            durationMs: null,
          }
        : {
            scanId: "scan-one",
            projectId: "project-one",
            errorCode: null,
            error: null,
            failedStage: null,
            retryable: null,
          }
    );
  }
);

test("stale GEO failures preserve false retryability and supplied error metadata", async () => {
  await db.exec(`INSERT INTO geo_scans (id, organization_id, project_id, status, error_code, error_message, failed_stage, retryable)
    VALUES ('stale-scan', 'org-one', 'project-one', 'failed', 'scan_stale', 'Worker timed out', 'stale', false)`);
  const [event] = await events();
  expect(JSON.parse(event?.payload ?? "null").data).toEqual({
    scanId: "stale-scan",
    projectId: "project-one",
    errorCode: "scan_stale",
    error: "Worker timed out",
    failedStage: "stale",
    retryable: false,
  });
});

test("lifecycle mutations, outbox and fanout share the caller's commit and rollback", async () => {
  await Effect.runPromise(
    createEndpoint({
      organizationId: org,
      url: "https://hooks.usenotra.com/receive",
      events: [
        "post.created",
        "post.updated",
        "post.deleted",
        "geo.scan.completed",
      ],
    }).pipe(Effect.provide(layers))
  );
  await insertPost("existing-post");
  const before = await events();
  const beforeDeliveries = await deliveries();
  const txDb = drizzle({ client: db });
  await expect(
    txDb.transaction(async (tx) => {
      await tx.execute(
        drizzleSql`INSERT INTO posts (id, organization_id, collection_id, title, content, content_type) VALUES ('rolled-back-post', 'org-one', 'collection-one', 'Title', 'Content', 'blog_post')`
      );
      await tx.execute(
        drizzleSql`UPDATE posts SET title = 'Rolled back title' WHERE id = 'existing-post'`
      );
      await tx.execute(
        drizzleSql`DELETE FROM posts WHERE id = 'existing-post'`
      );
      await tx.execute(
        drizzleSql`INSERT INTO geo_scans (id, organization_id, project_id, status) VALUES ('rolled-back-scan', 'org-one', 'project-one', 'completed')`
      );
      expect(
        (await tx.execute(drizzleSql`SELECT id FROM webhook_events`)).rows
      ).toHaveLength(5);
      expect(
        (await tx.execute(drizzleSql`SELECT id FROM webhook_deliveries`)).rows
      ).toHaveLength(5);
      throw new Error("caller failed");
    })
  ).rejects.toThrow("caller failed");
  expect(await events()).toEqual(before);
  expect(await deliveries()).toEqual(beforeDeliveries);
  expect((await db.query("SELECT id, title FROM posts")).rows).toEqual([
    { id: "existing-post", title: "Original title" },
  ]);
  expect((await db.query("SELECT id FROM geo_scans")).rows).toHaveLength(0);
  await txDb.transaction(async (tx) => {
    await tx.execute(drizzleSql`UPDATE posts SET title = 'Committed title'`);
    expect(
      (await tx.execute(drizzleSql`SELECT id FROM webhook_events`)).rows
    ).toHaveLength(2);
  });
  expect(await events()).toHaveLength(2);
  expect(await deliveries()).toHaveLength(2);
});

test.each(["webhook_events", "webhook_deliveries"])(
  "a failure inserting %s rolls back the post and GEO mutation",
  async (table) => {
    await Effect.runPromise(
      createEndpoint({
        organizationId: org,
        url: "https://hooks.usenotra.com/receive",
        events: [
          "post.created",
          "post.updated",
          "post.deleted",
          "geo.scan.completed",
        ],
      }).pipe(Effect.provide(layers))
    );
    await insertPost();
    await db.exec(
      "INSERT INTO geo_scans (id, organization_id, project_id) VALUES ('scan-one', 'org-one', 'project-one')"
    );
    const before = await events();
    const beforeDeliveries = await deliveries();
    await db.exec(`CREATE FUNCTION reject_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'outbox unavailable'; END; $$;
    CREATE TRIGGER reject_outbox BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION reject_outbox();`);
    try {
      await expect(insertPost("failed-post")).rejects.toThrow(
        "outbox unavailable"
      );
      await expect(
        db.exec("UPDATE posts SET title = 'Must roll back'")
      ).rejects.toThrow("outbox unavailable");
      await expect(db.exec("DELETE FROM posts")).rejects.toThrow(
        "outbox unavailable"
      );
      await expect(
        db.exec("DELETE FROM post_collections WHERE id = 'collection-one'")
      ).rejects.toThrow("outbox unavailable");
      await expect(
        db.exec("UPDATE geo_scans SET status = 'completed'")
      ).rejects.toThrow("outbox unavailable");
      await expect(
        db.exec(
          "INSERT INTO geo_scans (id, organization_id, project_id, status) VALUES ('failed-scan', 'org-one', 'project-one', 'completed')"
        )
      ).rejects.toThrow("outbox unavailable");
      expect(await events()).toEqual(before);
      expect(await deliveries()).toEqual(beforeDeliveries);
      expect((await db.query("SELECT id, title FROM posts")).rows).toEqual([
        { id: "post-one", title: "Original title" },
      ]);
      expect((await db.query("SELECT id, status FROM geo_scans")).rows).toEqual(
        [{ id: "scan-one", status: "running" }]
      );
      expect(
        (
          await db.query(
            "SELECT id FROM post_collections WHERE id = 'collection-one'"
          )
        ).rows
      ).toHaveLength(1);
    } finally {
      await db.exec(
        `DROP TRIGGER reject_outbox ON ${table}; DROP FUNCTION reject_outbox()`
      );
    }
    await db.exec(
      "UPDATE posts SET title = 'Recovered'; UPDATE geo_scans SET status = 'completed'"
    );
    expect(await events()).toHaveLength(3);
  }
);

test("real deliver signs the exact stored bytes and identity of every new lifecycle and GEO event", async () => {
  const { secret } = await Effect.runPromise(
    createEndpoint({
      organizationId: org,
      url: "https://hooks.usenotra.com/receive",
      events: [
        "post.created",
        "post.updated",
        "post.published",
        "post.unpublished",
        "post.deleted",
        "geo.scan.completed",
        "geo.scan.failed",
      ],
    }).pipe(Effect.provide(layers))
  );
  await insertPost();
  await db.exec(`UPDATE posts SET title = 'Signed title';
    UPDATE posts SET status = 'published';
    UPDATE posts SET status = 'draft';
    DELETE FROM posts;
    INSERT INTO geo_scans (id, organization_id, project_id, status, run_id, checks_total, checks_failed, mentions, duration_ms)
      VALUES ('completed-scan', 'org-one', 'project-one', 'completed', 'run-one', 0, 0, 0, 0);
    INSERT INTO geo_scans (id, organization_id, project_id, status, error_code, error_message, failed_stage, retryable)
      VALUES ('failed-scan', 'org-one', 'project-one', 'failed', 'handoff_failed', 'Could not dispatch', 'handoff', true);`);
  const stored = await events();
  const pending = await deliveries();
  expect(new Set(stored.map((row) => row.event_type))).toEqual(
    new Set([
      "post.created",
      "post.updated",
      "post.published",
      "post.unpublished",
      "post.deleted",
      "geo.scan.completed",
      "geo.scan.failed",
    ])
  );
  expect(pending).toHaveLength(stored.length);
  for (const delivery of pending) {
    await Effect.runPromise(
      deliver(Schema.decodeUnknownSync(DeliveryId)(delivery.id)).pipe(
        Effect.provide(layers)
      )
    );
    await Effect.runPromise(
      deliver(Schema.decodeUnknownSync(DeliveryId)(delivery.id)).pipe(
        Effect.provide(layers)
      )
    );
  }
  expect(sent).toHaveLength(stored.length);
  for (const request of sent) {
    const headers = new Headers(request.headers);
    const event = stored.find(
      (row) => row.id === headers.get("x-notra-event-id")
    );
    const delivery = pending.find(
      (row) => row.id === headers.get("x-notra-delivery-id")
    );
    expect(event).toBeDefined();
    if (!(event && delivery)) {
      throw new Error("missing stored event or delivery");
    }
    const timestamp = headers.get("x-notra-timestamp");
    expect(timestamp).toMatch(/^\d+$/);
    const signature = createHmac(
      "sha256",
      Buffer.from(secret.replace(/^whsec_/, ""), "base64")
    )
      .update(`${event.id}.${delivery.id}.${timestamp}.${request.payload}`)
      .digest("base64");
    expect(headers.get("x-notra-signature")).toBe(`v1,${signature}`);
    expect(delivery?.event_id).toBe(event?.id);
    expect(request.url).toBe("https://hooks.usenotra.com/receive");
    expect(request.payload).toBe(event?.payload);
    expect(headers.get("x-notra-event")).toBe(event?.event_type);
    expect(headers.get("content-type")).toBe("application/json");
    const payload = JSON.parse(request.payload);
    const dataByType = {
      "geo.scan.completed": {
        scanId: "completed-scan",
        projectId: "project-one",
        runId: "run-one",
        checksTotal: 0,
        checksFailed: 0,
        mentions: 0,
        durationMs: 0,
      },
      "geo.scan.failed": {
        scanId: "failed-scan",
        projectId: "project-one",
        errorCode: "handoff_failed",
        error: "Could not dispatch",
        failedStage: "handoff",
        retryable: true,
      },
    };
    expect(payload).toEqual({
      id: event?.id,
      type: event?.event_type,
      apiVersion: "2026-10-06",
      createdAt: expect.any(String),
      organizationId: "org-one",
      data: Object.entries(dataByType).find(
        ([type]) => type === event?.event_type
      )?.[1] ?? { postId: "post-one" },
    });
    expect(
      await Effect.runPromise(verifySignature(secret, request.payload, headers))
    ).toBe(true);
    expect(
      await Effect.runPromise(
        verifySignature(secret, `${request.payload} `, headers)
      )
    ).toBe(false);
    headers.set("x-notra-event-id", "whev_wrong_identity");
    expect(
      await Effect.runPromise(verifySignature(secret, request.payload, headers))
    ).toBe(false);
  }
  expect((await deliveries()).every((row) => row.status === "succeeded")).toBe(
    true
  );
  expect((await db.query("SELECT id FROM webhook_attempts")).rows).toHaveLength(
    stored.length
  );
});

test("API subscriptions accept all twelve events and reject unknown, empty and oversized lists", () => {
  const types = WEBHOOK_EVENT_FIXTURES.map((event) => event.type);
  expect(types).toHaveLength(12);
  expect(webhookEventTypeSchema.options).toEqual(types);
  expect(
    createWebhookRequestSchema.safeParse({
      url: "https://example.com/hook",
      events: types,
    }).success
  ).toBe(true);
  for (const event of types) {
    expect(
      createWebhookRequestSchema.safeParse({
        url: "https://example.com/hook",
        events: [event],
      }).success
    ).toBe(true);
  }
  for (const invalid of [[], ["unknown.event"], [...types, "post.created"]]) {
    expect(
      createWebhookRequestSchema.safeParse({
        url: "https://example.com/hook",
        events: invalid,
      }).success
    ).toBe(false);
  }
});

test.each([...WEBHOOK_EVENT_FIXTURES])(
  "Effect decodes $type only with its matching payload",
  (event) => {
    expect(Schema.decodeUnknownSync(EventData)(event)).toEqual(event);
    expect(() =>
      Schema.decodeUnknownSync(EventData)({
        type: event.type,
        data: { unexpected: true },
      })
    ).toThrow();
  }
);

test("oversized Unicode GEO errors are truncated by characters and keep payloads below 64 KiB", async () => {
  const errorCode = "🙂漢".repeat(300);
  const error = '🙂漢"\n'.repeat(2500);
  await db.query(
    `INSERT INTO geo_scans (id, organization_id, project_id, status, error_code, error_message, failed_stage, retryable)
    VALUES ('unicode-scan', 'org-one', 'project-one', 'failed', $1, $2, 'execution', false)`,
    [errorCode, error]
  );
  const [event] = await events();
  const payload = JSON.parse(event?.payload ?? "null");
  expect(payload.data).toEqual({
    scanId: "unicode-scan",
    projectId: "project-one",
    errorCode: Array.from(errorCode).slice(0, 256).join(""),
    error: Array.from(error).slice(0, 4096).join(""),
    failedStage: "execution",
    retryable: false,
  });
  expect(new TextEncoder().encode(event?.payload).length).toBeLessThanOrEqual(
    65_536
  );
  expect(
    (await db.query("SELECT error_code, error_message FROM geo_scans")).rows
  ).toEqual([{ error_code: errorCode, error_message: error }]);
});

test.each(["completed", "failed"])(
  "a retained terminal scan stays silent after %s event retention cleanup",
  async (status) => {
    await db.query(
      "INSERT INTO geo_scans (id, organization_id, project_id, status) VALUES ('scan-one', 'org-one', 'project-one', $1)",
      [status]
    );
    expect(await events()).toHaveLength(1);
    await db.exec("DELETE FROM webhook_events");
    await db.query("UPDATE geo_scans SET status = $1", [
      status === "completed" ? "failed" : "completed",
    ]);
    expect(await events()).toHaveLength(0);
  }
);

test("the payload size guard rolls back oversized identifiers but large post content stays reference-only", async () => {
  await expect(insertPost("🙂".repeat(17_000))).rejects.toThrow(
    "Webhook payload exceeds 64 KiB"
  );
  expect(await events()).toHaveLength(0);
  expect((await db.query("SELECT id FROM posts")).rows).toHaveLength(0);
  await insertPost();
  await db.query("UPDATE posts SET content = $1", ["🙂".repeat(100_000)]);
  for (const event of await events()) {
    expect(new TextEncoder().encode(event.payload).length).toBeLessThanOrEqual(
      65_536
    );
    expect(JSON.parse(event.payload).data).toEqual({ postId: "post-one" });
  }
});

test("a database fanout constraint failure rolls back every matching endpoint and the mutation", async () => {
  await db.exec(`INSERT INTO webhook_endpoints (id, organization_id, url, events, secret) VALUES
    ('valid', 'org-one', 'https://example.com/valid', ARRAY['post.created'], 'encrypted-synthetic-secret'),
    ('malformed', 'org-one', 'https://example.com/malformed', ARRAY['post.created'], 'malformed-secret');
    ALTER TABLE webhook_deliveries ADD CONSTRAINT reject_malformed_snapshot CHECK (secret <> 'malformed-secret')`);
  try {
    await expect(insertPost()).rejects.toThrow("reject_malformed_snapshot");
    expect(await events()).toHaveLength(0);
    expect(await deliveries()).toHaveLength(0);
    expect((await db.query("SELECT id FROM posts")).rows).toHaveLength(0);
  } finally {
    await db.exec(
      "ALTER TABLE webhook_deliveries DROP CONSTRAINT reject_malformed_snapshot"
    );
  }
  await db.exec(
    "UPDATE webhook_endpoints SET enabled = false WHERE id = 'malformed'"
  );
  await insertPost();
  expect((await deliveries()).map((row) => row.endpoint_id)).toEqual(["valid"]);
});
