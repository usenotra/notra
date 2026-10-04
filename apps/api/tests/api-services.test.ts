import { describe, expect, test } from "bun:test";

import { InternalDashboardTimeoutError } from "@notra/schemas/api/internal-dashboard";
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
