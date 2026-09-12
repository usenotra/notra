import { describe, expect, test } from "bun:test";

import {
  InternalDashboardAdapterError,
  InternalDashboardError,
  InternalDashboardTimeoutError,
} from "@notra/schemas/api/internal-dashboard";
import { QstashError } from "@notra/schemas/api/qstash";
import { Effect, Fiber, Layer } from "effect";
import * as TestClock from "effect/testing/TestClock";
import { z } from "zod";

import { QSTASH_REQUEST_TIMEOUT_MS } from "../src/constants/qstash";
import {
  InternalDashboardService,
  internalDashboardLayer,
} from "../src/lib/internal-dashboard";
import {
  QstashService,
  deleteQstashWithRetry,
  qstashLayer,
} from "../src/lib/qstash";
import { runServiceEffect } from "../src/utils/run-service-effect";

describe("QStash adapter", () => {
  test("successful creation preserves explicit schedule IDs when the response omits one", async () => {
    for (const body of ['{"scheduleId":"returned"}', "{}", ""]) {
      const id = await runServiceEffect(
        Effect.gen(function* () {
          const service = yield* QstashService;
          return yield* service.create({
            triggerId: "trigger",
            cron: "0 0 * * *",
            scheduleId: "existing",
          });
        }).pipe(
          Effect.provide(
            qstashLayer(
              {
                QSTASH_TOKEN: "test",
                WORKFLOW_BASE_URL: "https://example.test/",
              },
              async (url, init) => {
                expect(String(url)).toEndWith(
                  encodeURIComponent(
                    "https://example.test/api/workflows/schedule"
                  )
                );
                expect(
                  new Headers(init?.headers).get("Upstash-Schedule-Id")
                ).toBe("existing");
                return new Response(body);
              }
            )
          )
        )
      );
      expect(id).toBe(body.includes("returned") ? "returned" : "existing");
    }
  });

  test("configuration failures stop before transport", async () => {
    let calls = 0;
    await expect(
      runServiceEffect(
        deleteQstashWithRetry("schedule").pipe(
          Effect.provide(
            qstashLayer({}, async () => {
              calls++;
              return new Response();
            })
          )
        )
      )
    ).rejects.toMatchObject({ kind: "configuration" });
    expect(calls).toBe(0);
  });

  test("404 deletion succeeds; HTTP failures retain status and are not retried by the transport", async () => {
    for (const status of [404, 400, 401, 403, 429, 500]) {
      let calls = 0;
      const layer = qstashLayer({ QSTASH_TOKEN: "test" }, async () => {
        calls++;
        return new Response("refused", { status });
      });
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const service = yield* QstashService;
          return yield* Effect.result(service.delete("schedule"));
        }).pipe(Effect.provide(layer))
      );
      expect(calls).toBe(1);
      if (status === 404) {
        expect(result._tag).toBe("Success");
      } else {
        expect(result._tag).toBe("Failure");
        if (result._tag === "Failure") {
          expect(result.failure.status).toBe(status);
        }
      }
    }
  });

  test("retries only eligible delete failures and preserves the attempt limit", async () => {
    for (const status of [400, 401, 403, 408, 425, 429, 500]) {
      let calls = 0;
      const layer = Layer.succeed(QstashService, {
        create: () => Effect.succeed("unused"),
        delete: () =>
          Effect.suspend(() => {
            calls++;
            return Effect.fail(
              new QstashError({
                kind: "http",
                status,
                message: "arbitrary message without status",
              })
            );
          }),
      });
      await Effect.runPromise(
        Effect.gen(function* () {
          const fiber = yield* Effect.result(
            deleteQstashWithRetry("schedule")
          ).pipe(Effect.forkChild);
          yield* TestClock.adjust(1000);
          const result = yield* Fiber.join(fiber);
          expect(result._tag).toBe("Failure");
        }).pipe(Effect.provide(layer), Effect.provide(TestClock.layer()))
      );
      expect(calls).toBe(status >= 408 ? 3 : 1);
    }
  });

  test("creation validates its response without retrying a possibly successful POST", async () => {
    for (const body of ['{"scheduleId":42}', "{}", "not-json"]) {
      let calls = 0;
      await expect(
        runServiceEffect(
          Effect.gen(function* () {
            const service = yield* QstashService;
            return yield* service.create({
              triggerId: "trigger",
              cron: "0 0 * * *",
            });
          }).pipe(
            Effect.provide(
              qstashLayer(
                {
                  QSTASH_TOKEN: "test",
                  WORKFLOW_BASE_URL: "https://example.test",
                },
                async () => {
                  calls++;
                  return new Response(body);
                }
              )
            )
          )
        )
      ).rejects.toMatchObject({ kind: "decode" });
      expect(calls).toBe(1);
    }
  });

  test("creation timeout aborts transport and never retries", async () => {
    let calls = 0;
    let aborted = false;
    const layer = qstashLayer(
      { QSTASH_TOKEN: "test", WORKFLOW_BASE_URL: "https://example.test" },
      (_url, init) => {
        calls++;
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
        });
      }
    );
    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* QstashService;
        const fiber = yield* Effect.result(
          service.create({ triggerId: "trigger", cron: "0 0 * * *" })
        ).pipe(Effect.forkChild);
        yield* TestClock.adjust(QSTASH_REQUEST_TIMEOUT_MS);
        const result = yield* Fiber.join(fiber);
        expect(result._tag === "Failure" && result.failure.kind).toBe(
          "timeout"
        );
      }).pipe(Effect.provide(layer), Effect.provide(TestClock.layer()))
    );
    expect(calls).toBe(1);
    expect(aborted).toBe(true);
  });
});

describe("Internal dashboard adapter", () => {
  test("successful calls decode the response and retain the unauthenticated fallback", async () => {
    const result = await runServiceEffect(
      Effect.gen(function* () {
        const service = yield* InternalDashboardService;
        return yield* service.call(
          "https://example.test",
          { value: 1 },
          z.object({ runId: z.string() })
        );
      }).pipe(
        Effect.provide(
          internalDashboardLayer({
            credentials: Effect.succeed(null),
            request: async (_url, init) => {
              expect(new Headers(init?.headers).has("authorization")).toBe(
                false
              );
              expect(init?.body).toBe('{"value":1}');
              return new Response('{"runId":"run"}');
            },
          })
        )
      )
    );
    expect(result).toEqual({ runId: "run" });
  });

  test("preserves HTTP domain evidence and Promise error identity", async () => {
    const body = JSON.stringify({
      code: "FEATURE_DISABLED",
      failure: { _tag: "GeoPromptNotFoundError" },
    });
    const layer = internalDashboardLayer({
      credentials: Effect.succeed("test"),
      request: async (_url, init) => {
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer test"
        );
        return new Response(body, { status: 403 });
      },
    });
    const result = runServiceEffect(
      Effect.gen(function* () {
        const service = yield* InternalDashboardService;
        return yield* service.call(
          "https://example.test",
          {},
          z.object({ runId: z.string() })
        );
      }).pipe(Effect.provide(layer))
    );
    await expect(result).rejects.toBeInstanceOf(InternalDashboardError);
    await expect(result).rejects.toMatchObject({
      status: 403,
      code: "FEATURE_DISABLED",
      body,
    });
  });

  test("invalid successful responses are decode failures", async () => {
    await expect(
      runServiceEffect(
        Effect.gen(function* () {
          const service = yield* InternalDashboardService;
          return yield* service.call(
            "https://example.test",
            {},
            z.object({ runId: z.string() })
          );
        }).pipe(
          Effect.provide(
            internalDashboardLayer({
              credentials: Effect.succeed(null),
              request: async () => new Response('{"runId":4}'),
            })
          )
        )
      )
    ).rejects.toBeInstanceOf(InternalDashboardAdapterError);
  });

  test("timeout includes body consumption and does not retry paid work", async () => {
    let calls = 0;
    let aborted = false;
    const layer = internalDashboardLayer({
      credentials: Effect.succeed(null),
      request: async (_url, init) => {
        calls++;
        return new Response(
          new ReadableStream({
            start(controller) {
              init?.signal?.addEventListener("abort", () => {
                aborted = true;
                controller.error(new Error("aborted"));
              });
            },
          })
        );
      },
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InternalDashboardService;
        const fiber = yield* Effect.result(
          service.call("https://example.test", {}, z.unknown(), 240_000)
        ).pipe(Effect.forkChild);
        yield* TestClock.adjust(240_000);
        const result = yield* Fiber.join(fiber);
        expect(result._tag).toBe("Failure");
        if (result._tag === "Failure") {
          expect(result.failure).toBeInstanceOf(InternalDashboardTimeoutError);
        }
      }).pipe(Effect.provide(layer), Effect.provide(TestClock.layer()))
    );
    expect(calls).toBe(1);
    expect(aborted).toBe(true);
  });
});
