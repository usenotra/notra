import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { readdir, readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { Effect, Layer, Redacted, Schema } from "effect";

import { WebhookQueueError, WebhookStorageError } from "../src/errors/webhooks";
import {
  claimDelivery,
  deliver,
  finishDelivery,
} from "../src/programs/deliveries";
import {
  createEndpoint,
  deleteEndpoint,
  listEndpoints,
} from "../src/programs/endpoints";
import { publishEvent } from "../src/programs/events";
import { publishGenerationOutcome } from "../src/programs/generation";
import {
  listAttempts,
  listDeliveries,
  retryDelivery,
} from "../src/programs/history";
import { cleanup, dispatchEvent, recover } from "../src/programs/recovery";
import { OrganizationId } from "../src/schemas/webhooks";
import { WebhookCrypto, webCryptoLayer } from "../src/services/crypto";
import { WebhookDatabase } from "../src/services/database";
import { WebhookQueues } from "../src/services/queue";
import {
  cloudflareTransportLayer,
  WebhookTransport,
} from "../src/services/transport";
import type { DeliveryOutcome, SendRequest } from "../src/types/webhooks";
import type { WorkerBindings } from "../src/types/worker";
import {
  parseRetryAfter,
  retryDelaySeconds,
  shouldRetry,
} from "../src/utils/retry";
import { signatureMessage, verifySignature } from "../src/utils/signature";
import { isPublicAddress, validateEndpointUrl } from "../src/utils/url";
import worker from "../src/worker";

const db = new PGlite();
const sql = <T = Record<string, unknown>>(
  query: string,
  parameters: readonly unknown[] = []
) =>
  Effect.tryPromise({
    try: () => db.query<T>(query, [...parameters]),
    catch: (cause) =>
      new WebhookStorageError({ operation: "test.query", cause }),
  });
const org = Schema.decodeUnknownSync(OrganizationId)("org-one");
const otherOrg = Schema.decodeUnknownSync(OrganizationId)("org-two");
const sent: SendRequest[] = [];
const queuedEvents: string[] = [];
const queuedDeliveries: string[] = [];
let queueFails = false;
let outcome: DeliveryOutcome = {
  statusCode: 200,
  error: null,
  durationMs: 20,
  retryAfterSeconds: null,
};
const layers = Layer.mergeAll(
  Layer.succeed(
    WebhookDatabase,
    WebhookDatabase.of({
      query: (query, parameters) =>
        sql(query, parameters).pipe(Effect.map((result) => result.rows)),
    })
  ),
  webCryptoLayer(Redacted.make(btoa("x".repeat(32)))),
  Layer.succeed(
    WebhookTransport,
    WebhookTransport.of({
      send: (request) =>
        Effect.sync(() => {
          sent.push(request);
          return outcome;
        }),
    })
  ),
  Layer.succeed(
    WebhookQueues,
    WebhookQueues.of({
      event: (id) =>
        queueFails
          ? Effect.fail(new WebhookQueueError({ operation: "test" }))
          : Effect.sync(() => {
              queuedEvents.push(id);
            }),
      delivery: (id) =>
        queueFails
          ? Effect.fail(new WebhookQueueError({ operation: "test" }))
          : Effect.sync(() => {
              queuedDeliveries.push(id);
            }),
    })
  )
);
const endpoint = (organizationId = org) =>
  createEndpoint({
    organizationId,
    url: "https://hooks.usenotra.com/receive",
    events: ["post.generation.completed"],
  });
const publish = (sourceKey = "job-1", organizationId = org) =>
  publishEvent({
    organizationId,
    sourceKey,
    event: {
      type: "post.generation.completed",
      data: { jobId: sourceKey, postId: "post-1" },
    },
  });

beforeAll(() =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* sql("CREATE TABLE organizations (id text PRIMARY KEY)");
      const migrations = new URL("../../db/migrations/", import.meta.url);
      const files = yield* Effect.promise(() => readdir(migrations));
      const file = files.find((name) =>
        name.endsWith("_webhook_delivery_pipeline.sql")
      );
      if (!file) {
        return yield* Effect.die("missing webhook migration");
      }
      const migration = yield* Effect.promise(() =>
        readFile(new URL(file, migrations), "utf8")
      );
      yield* Effect.promise(() => db.exec(migration));
      yield* sql("INSERT INTO organizations VALUES ('org-one'), ('org-two')");
    })
  )
);
beforeEach(() =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* sql("TRUNCATE webhook_events, webhook_endpoints CASCADE");
      sent.length = 0;
      queuedEvents.length = 0;
      queuedDeliveries.length = 0;
      queueFails = false;
      outcome = {
        statusCode: 200,
        error: null,
        durationMs: 20,
        retryAfterSeconds: null,
      };
    })
  )
);
afterAll(() => db.close());

describe("durable webhook pipeline", () => {
  test("snapshots matching endpoints at publish time and deduplicates repeated publishes by source key", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        yield* endpoint();
        yield* endpoint(otherOrg);
        const ids = yield* Effect.all([publish(), publish()], {
          concurrency: 2,
        });
        expect(ids[0]).toBe(ids[1]);
        yield* endpoint(); // A subscription added after the event does not receive history.
        yield* publish();
        expect(yield* listDeliveries(org)).toHaveLength(1);
        expect(yield* listDeliveries(otherOrg)).toHaveLength(0);
      }).pipe(Effect.provide(layers))
    ));

  test("a second deliver call is a no-op once claimed, signs exact bytes and records successful delivery", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        const { secret } = yield* endpoint();
        yield* publish();
        const [delivery] = yield* listDeliveries(org);
        if (!delivery) {
          return yield* Effect.die("missing delivery");
        }
        yield* Effect.all([deliver(delivery.id), deliver(delivery.id)], {
          concurrency: 2,
        });
        expect(sent).toHaveLength(1);
        const request = sent[0];
        if (!request) {
          return yield* Effect.die("missing request");
        }
        expect(
          yield* verifySignature(
            secret,
            request.payload,
            new Headers(request.headers)
          )
        ).toBe(true);
        expect(
          yield* verifySignature(
            secret,
            `${request.payload} `,
            new Headers(request.headers)
          )
        ).toBe(false);
        expect((yield* listDeliveries(org))[0]?.status).toBe("succeeded");
        expect((yield* listAttempts(org, delivery.id))[0]?.statusCode).toBe(
          200
        );
        expect(JSON.stringify(yield* listEndpoints(org))).not.toContain(secret);
      }).pipe(Effect.provide(layers))
    ));

  test("queue failure leaves a recoverable outbox", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        yield* endpoint();
        const id = yield* publish();
        queueFails = true;
        expect((yield* Effect.result(recover()))._tag).toBe("Failure");
        queueFails = false;
        yield* recover();
        expect(queuedEvents).toContain(id);
        const [delivery] = yield* listDeliveries(org);
        if (!delivery) {
          return yield* Effect.die("missing delivery");
        }
        queuedDeliveries.length = 0;
        yield* dispatchEvent(id);
        expect(queuedDeliveries).toEqual([delivery.id]);
        const dispatched = yield* sql(
          "SELECT dispatch_at FROM webhook_events WHERE id = $1",
          [id]
        );
        expect(dispatched.rows).toEqual([{ dispatch_at: null }]);
      }).pipe(Effect.provide(layers))
    ));

  test("transient failures schedule retries, permanent responses stop", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        yield* endpoint();
        yield* publish();
        const [delivery] = yield* listDeliveries(org);
        if (!delivery) {
          return yield* Effect.die("missing delivery");
        }
        outcome = {
          statusCode: 429,
          error: "http_429",
          durationMs: 10,
          retryAfterSeconds: 600,
        };
        yield* deliver(delivery.id);
        expect((yield* listDeliveries(org))[0]?.status).toBe("retrying");
        const scheduled = yield* sql<{ seconds: number }>(
          "SELECT extract(epoch FROM next_attempt_at - now())::int AS seconds FROM webhook_deliveries WHERE id = $1",
          [delivery.id]
        );
        expect(scheduled.rows).toEqual([{ seconds: expect.any(Number) }]);
        const seconds = scheduled.rows[0]?.seconds ?? 0;
        expect(seconds).toBeGreaterThanOrEqual(595);
        expect(seconds).toBeLessThanOrEqual(600);
        expect(yield* claimDelivery(delivery.id)).toBeUndefined();
        yield* sql(
          "UPDATE webhook_deliveries SET next_attempt_at = now() - interval '1 minute'"
        );
        outcome = {
          statusCode: 400,
          error: "http_400",
          durationMs: 10,
          retryAfterSeconds: null,
        };
        yield* deliver(delivery.id);
        expect((yield* listDeliveries(org))[0]?.status).toBe("failed");
        expect(yield* listAttempts(org, delivery.id)).toHaveLength(2);
      }).pipe(Effect.provide(layers))
    ));

  test("expired claims recover and fence late worker results", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        yield* endpoint();
        yield* publish();
        const [summary] = yield* listDeliveries(org);
        if (!summary) {
          return yield* Effect.die("missing delivery");
        }
        const old = yield* claimDelivery(summary.id);
        if (!old) {
          return yield* Effect.die("missing claim");
        }
        yield* sql(
          "UPDATE webhook_deliveries SET lease_expires_at = now() - interval '1 minute'"
        );
        yield* recover();
        const current = yield* claimDelivery(summary.id);
        if (!current) {
          return yield* Effect.die("missing recovered claim");
        }
        yield* finishDelivery(old, outcome);
        expect((yield* listDeliveries(org))[0]?.status).toBe("sending");
        yield* finishDelivery(current, outcome);
        const attempts = yield* listAttempts(org, summary.id);
        expect(attempts[0]?.error).toBe("lease_expired_outcome_unknown");
        expect(attempts[1]?.statusCode).toBe(200);
      }).pipe(Effect.provide(layers))
    ));

  test("deletion cancels unsent work and enforces tenant isolation", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        const { endpoint: created } = yield* endpoint();
        yield* publish();
        const [delivery] = yield* listDeliveries(org);
        if (!delivery) {
          return yield* Effect.die("missing delivery");
        }
        expect(
          (yield* Effect.result(listAttempts(otherOrg, delivery.id)))._tag
        ).toBe("Failure");
        expect(
          (yield* Effect.result(deleteEndpoint(otherOrg, created.id)))._tag
        ).toBe("Failure");
        yield* deleteEndpoint(org, created.id);
        yield* deliver(delivery.id);
        expect(sent).toHaveLength(0);
        expect((yield* listDeliveries(org))[0]?.status).toBe("cancelled");
      }).pipe(Effect.provide(layers))
    ));

  test("cleanup retains pending deliveries", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        yield* endpoint();
        const id = yield* publish();
        yield* dispatchEvent(id);
        yield* sql(
          "UPDATE webhook_events SET created_at = now() - interval '40 days'"
        );
        expect(yield* cleanup()).toHaveLength(0);
        const [delivery] = yield* listDeliveries(org);
        if (!delivery) {
          return yield* Effect.die("missing delivery");
        }
        yield* deliver(delivery.id);
        expect(yield* cleanup()).toHaveLength(1);
      }).pipe(Effect.provide(layers))
    ));
});

test("crypto authenticates ciphertext and rejects old signatures", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const cryptography = yield* WebhookCrypto;
      const secret = yield* cryptography.createSecret();
      const encrypted = yield* cryptography.encrypt(secret, "endpoint-one");
      expect(encrypted).not.toContain(secret);
      expect(yield* cryptography.decrypt(encrypted, "endpoint-one")).toBe(
        secret
      );
      expect(
        (yield* Effect.result(cryptography.decrypt(encrypted, "endpoint-two")))
          ._tag
      ).toBe("Failure");
      const signature = yield* cryptography.sign(
        secret,
        signatureMessage("event", "delivery", "1", "{}")
      );
      expect(
        yield* verifySignature(
          secret,
          "{}",
          new Headers({
            "x-notra-event-id": "event",
            "x-notra-delivery-id": "delivery",
            "x-notra-timestamp": "1",
            "x-notra-signature": `v1,${signature}`,
          })
        )
      ).toBe(false);
    }).pipe(Effect.provide(layers))
  ));

test("rejects unsafe destinations and classifies backoff", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      for (const url of [
        "http://public.com",
        "https://127.0.0.1",
        "https://[::1]",
        "https://user:pass@public.com",
        "https://public.com:8443",
        "https://service.internal",
        "https://2130706433",
        "https://0x7f000001",
      ]) {
        expect((yield* Effect.result(validateEndpointUrl(url)))._tag).toBe(
          "Failure"
        );
      }
      for (const address of [
        "127.0.0.1",
        "10.1.2.3",
        "169.254.169.254",
        "100.64.0.1",
        "::1",
        "::ffff:127.0.0.1",
        "fc00::1",
        "fe80::1",
        "224.0.0.1",
      ]) {
        expect(isPublicAddress(address)).toBe(false);
      }
      expect(isPublicAddress("1.1.1.1")).toBe(true);
      expect(parseRetryAfter("120", 0)).toBe(120);
      expect(retryDelaySeconds(1, 600)).toBe(600);
      expect(
        shouldRetry(
          {
            statusCode: 503,
            error: "http_503",
            durationMs: 0,
            retryAfterSeconds: null,
          },
          8
        )
      ).toBe(false);
    })
  ));

test("manual retry preserves attempts and starts a bounded new cycle", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* endpoint();
      yield* publish();
      const [delivery] = yield* listDeliveries(org);
      if (!delivery) {
        return yield* Effect.die("missing delivery");
      }
      outcome = {
        statusCode: 503,
        error: "http_503",
        durationMs: 20,
        retryAfterSeconds: null,
      };
      for (let attempt = 0; attempt < 8; attempt++) {
        yield* sql(
          "UPDATE webhook_deliveries SET next_attempt_at = now() - interval '1 minute'"
        );
        yield* deliver(delivery.id);
      }
      expect((yield* listDeliveries(org))[0]?.status).toBe("failed");
      expect((yield* Effect.result(retryDelivery(org, delivery.id)))._tag).toBe(
        "Failure"
      );
      yield* sql(
        "UPDATE webhook_deliveries SET updated_at = now() - interval '2 minutes'"
      );
      const retries = yield* Effect.all(
        [
          Effect.result(retryDelivery(org, delivery.id)),
          Effect.result(retryDelivery(org, delivery.id)),
        ],
        { concurrency: 2 }
      );
      expect(
        retries.filter((result) => result._tag === "Success")
      ).toHaveLength(1);
      yield* deliver(delivery.id);
      expect((yield* listDeliveries(org))[0]?.status).toBe("retrying");
      expect(yield* listAttempts(org, delivery.id)).toHaveLength(9);
    }).pipe(Effect.provide(layers))
  ));

test("a delivery insert failure rolls back the event and can be retried", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* endpoint();
      yield* sql(
        `CREATE FUNCTION reject_test_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test insert failure'; END; $$`
      );
      yield* sql(
        "CREATE TRIGGER reject_test_delivery BEFORE INSERT ON webhook_deliveries FOR EACH ROW EXECUTE FUNCTION reject_test_delivery()"
      );
      expect((yield* Effect.result(publish()))._tag).toBe("Failure");
      expect((yield* sql("SELECT id FROM webhook_events")).rows).toHaveLength(
        0
      );
      yield* sql("DROP TRIGGER reject_test_delivery ON webhook_deliveries");
      yield* sql("DROP FUNCTION reject_test_delivery()");
      yield* publish();
      expect(yield* listDeliveries(org)).toHaveLength(1);
    }).pipe(Effect.provide(layers))
  ));

test("generation outcome schema rejects missing posts and emits failure/skipped events", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* createEndpoint({
        organizationId: org,
        url: "https://hooks.usenotra.com/receive",
        events: [
          "post.generation.completed",
          "post.generation.failed",
          "post.generation.skipped",
        ],
      });
      expect(
        (yield* Effect.result(
          publishGenerationOutcome({
            id: "missing",
            organizationId: org,
            status: "completed",
            postId: null,
            error: null,
          })
        ))._tag
      ).toBe("Failure");
      yield* publishGenerationOutcome({
        id: "failed",
        organizationId: org,
        status: "failed",
        postId: null,
        error: "Generation failed",
      });
      yield* publishGenerationOutcome({
        id: "skipped",
        organizationId: org,
        status: "skipped",
        postId: null,
        error: "No activity",
      });
      yield* publishGenerationOutcome({
        id: "running",
        organizationId: org,
        status: "running",
        postId: null,
        error: null,
      });
      expect(
        (yield* listDeliveries(org))
          .map((delivery) => delivery.eventType)
          .sort()
      ).toEqual(["post.generation.failed", "post.generation.skipped"]);
    }).pipe(Effect.provide(layers))
  ));

const dnsAnswer = (addresses: readonly string[]) =>
  Response.json({
    Status: 0,
    Answer: addresses.map((data) => ({
      type: data.includes(":") ? 28 : 1,
      data,
    })),
  });

const sendThrough = (
  resolve: (type: string) => Response,
  respond: (input: string, init: RequestInit | undefined) => Response
) =>
  Effect.gen(function* () {
    const calls: string[] = [];
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        calls.push(url);
        if (url.startsWith("https://cloudflare-dns.com/dns-query")) {
          return Promise.resolve(
            resolve(new URL(url).searchParams.get("type") ?? "")
          );
        }
        return Promise.resolve(respond(url, init));
      }
    );
    const transport = yield* WebhookTransport;
    const result = yield* transport
      .send({
        url: "https://hooks.usenotra.com/receive",
        payload: "{}",
        headers: { "content-type": "application/json" },
      })
      .pipe(Effect.ensuring(Effect.sync(() => fetchSpy.mockRestore())));
    return { result, calls };
  }).pipe(Effect.provide(cloudflareTransportLayer));

test("transport refuses private DNS answers, never follows redirects and reads retry-after", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const privateTarget = yield* sendThrough(
        (type) => dnsAnswer(type === "A" ? ["1.1.1.1"] : ["fd00::1"]),
        () => new Response(null, { status: 200 })
      );
      expect(privateTarget.result.error).toBe("unsafe_url");
      expect(privateTarget.result.statusCode).toBeNull();
      expect(
        privateTarget.calls.filter(
          (url) => new URL(url).hostname === "hooks.usenotra.com"
        )
      ).toHaveLength(0);

      const unresolvable = yield* sendThrough(
        () => Response.json({ Status: 3 }),
        () => new Response(null, { status: 200 })
      );
      expect(unresolvable.result.error).toBe("network");

      const redirect = yield* sendThrough(
        () => dnsAnswer(["1.1.1.1"]),
        () =>
          new Response(null, {
            status: 302,
            headers: { location: "https://169.254.169.254/latest" },
          })
      );
      expect(redirect.result.statusCode).toBe(302);
      expect(redirect.result.error).toBe("http_302");
      expect(
        redirect.calls.filter(
          (url) => new URL(url).hostname === "169.254.169.254"
        )
      ).toHaveLength(0);

      const throttled = yield* sendThrough(
        (type) => dnsAnswer(type === "A" ? ["1.1.1.1"] : []),
        (_url, init) => {
          expect(init?.redirect).toBe("manual");
          expect(init?.method).toBe("POST");
          expect(init?.body).toBe("{}");
          return new Response("slow down", {
            status: 503,
            headers: { "retry-after": "120" },
          });
        }
      );
      expect(throttled.result.statusCode).toBe(503);
      expect(throttled.result.error).toBe("http_503");
      expect(throttled.result.retryAfterSeconds).toBe(120);

      const accepted = yield* sendThrough(
        () => dnsAnswer(["1.1.1.1"]),
        () => new Response(null, { status: 204 })
      );
      expect(accepted.result.statusCode).toBe(204);
      expect(accepted.result.error).toBeNull();
    })
  ));

const idleMetrics = { backlogCount: 0, backlogBytes: 0 };
const queueStub = <T>(): Queue<T> => ({
  metrics: () => Promise.resolve(idleMetrics),
  send: () => Promise.resolve({ metadata: { metrics: idleMetrics } }),
  sendBatch: () => Promise.resolve({ metadata: { metrics: idleMetrics } }),
});

const bindings: WorkerBindings = {
  DATABASE_URL: "postgres://user:password@localhost:1/notra",
  WEBHOOK_ENCRYPTION_KEY: btoa("x".repeat(32)),
  EVENT_QUEUE: queueStub(),
  DELIVERY_QUEUE: queueStub(),
};

const runBatch = async (queue: string, body: unknown) => {
  const acked: string[] = [];
  const retried: (QueueRetryOptions | undefined)[] = [];
  const batch: MessageBatch<unknown> = {
    queue,
    messages: [
      {
        id: "message-1",
        timestamp: new Date(),
        body,
        attempts: 1,
        ack: () => {
          acked.push("message-1");
        },
        retry: (options) => {
          retried.push(options);
        },
      },
    ],
    metadata: { metrics: idleMetrics },
    ackAll: () => {},
    retryAll: () => {},
  };
  await worker.queue(batch, bindings);
  return { acked, retried };
};

test("worker retries messages it cannot process instead of acking or crashing", async () => {
  const unknownQueue = await runBatch("notra-unknown", { deliveryId: "x" });
  expect(unknownQueue.acked).toHaveLength(0);
  expect(unknownQueue.retried).toEqual([{ delaySeconds: 60 }]);

  const malformed = await runBatch("notra-webhook-deliveries", {
    nope: true,
  });
  expect(malformed.acked).toHaveLength(0);
  expect(malformed.retried).toEqual([{ delaySeconds: 60 }]);

  const unreachableDatabase = await runBatch("notra-webhook-events", {
    eventId: "whev_missing",
  });
  expect(unreachableDatabase.acked).toHaveLength(0);
  expect(unreachableDatabase.retried).toEqual([{ delaySeconds: 60 }]);
});
