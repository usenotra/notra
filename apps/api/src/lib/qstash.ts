import {
  QstashError,
  qstashScheduleResponseSchema,
} from "@notra/schemas/api/qstash";
import { Context, Effect, Layer, Schedule } from "effect";

import {
  QSTASH_DELETE_RETRY_DELAY_MS,
  QSTASH_REQUEST_TIMEOUT_MS,
} from "../constants/qstash";
import type { QstashEnv, QstashOperations } from "../types/qstash";

export class QstashService extends Context.Service<
  QstashService,
  QstashOperations
>()("api/Qstash") {}

// Keep the existing platform fetch transport, but own cancellation and decoding
// inside the adapter rather than leaking them into schedule transactions.
export function qstashLayer(env: QstashEnv, request: typeof fetch = fetch) {
  return Layer.succeed(
    QstashService,
    QstashService.of({
      create: Effect.fn("Qstash.create")(function* (input) {
        if (!env.QSTASH_TOKEN || !env.WORKFLOW_BASE_URL) {
          return yield* Effect.fail(
            new QstashError({
              kind: "configuration",
              message: !env.QSTASH_TOKEN
                ? "QSTASH_TOKEN is not configured"
                : "WORKFLOW_BASE_URL is not configured",
            })
          );
        }
        const destination = `${env.WORKFLOW_BASE_URL.replace(/\/$/, "")}/api/workflows/schedule`;
        return yield* Effect.tryPromise({
          try: async (signal) => {
            const response = await request(
              `https://qstash.upstash.io/v2/schedules/${encodeURIComponent(destination)}`,
              {
                method: "POST",
                signal,
                headers: {
                  Authorization: `Bearer ${env.QSTASH_TOKEN}`,
                  "Content-Type": "application/json",
                  "Upstash-Cron": input.cron,
                  ...(input.scheduleId
                    ? { "Upstash-Schedule-Id": input.scheduleId }
                    : {}),
                },
                body: JSON.stringify({ triggerId: input.triggerId }),
              }
            );
            if (!response.ok) {
              const body = await response.text().catch(() => "");
              throw new QstashError({
                kind: "http",
                status: response.status,
                message:
                  `Failed to create QStash schedule: ${response.status} ${body}`.trim(),
              });
            }
            const parsed = qstashScheduleResponseSchema.safeParse(
              await response.json().catch(() => null)
            );
            const id = parsed.success
              ? (parsed.data.scheduleId ?? input.scheduleId)
              : input.scheduleId;
            if (!id) {
              throw new QstashError({
                kind: "decode",
                message: "QStash schedule id was not returned",
              });
            }
            return id;
          },
          catch: (cause) =>
            cause instanceof QstashError
              ? cause
              : new QstashError({
                  kind: "transport",
                  message: "QStash request failed",
                }),
        }).pipe(
          Effect.timeoutOrElse({
            duration: QSTASH_REQUEST_TIMEOUT_MS,
            orElse: () =>
              Effect.fail(
                new QstashError({
                  kind: "timeout",
                  message: "QStash request timed out",
                })
              ),
          })
        );
      }),
      delete: Effect.fn("Qstash.delete")(function* (scheduleId) {
        if (!env.QSTASH_TOKEN) {
          return yield* Effect.fail(
            new QstashError({
              kind: "configuration",
              message: "QSTASH_TOKEN is not configured",
            })
          );
        }
        yield* Effect.tryPromise({
          try: async (signal) => {
            const response = await request(
              `https://qstash.upstash.io/v2/schedules/${encodeURIComponent(scheduleId)}`,
              {
                method: "DELETE",
                signal,
                headers: { Authorization: `Bearer ${env.QSTASH_TOKEN}` },
              }
            );
            if (!response.ok && response.status !== 404) {
              const body = await response.text().catch(() => "");
              throw new QstashError({
                kind: "http",
                status: response.status,
                message:
                  `Failed to delete QStash schedule ${scheduleId}: ${response.status} ${body}`.trim(),
              });
            }
          },
          catch: (cause) =>
            cause instanceof QstashError
              ? cause
              : new QstashError({
                  kind: "transport",
                  message: "QStash request failed",
                }),
        }).pipe(
          Effect.timeoutOrElse({
            duration: QSTASH_REQUEST_TIMEOUT_MS,
            orElse: () =>
              Effect.fail(
                new QstashError({
                  kind: "timeout",
                  message: "QStash request timed out",
                })
              ),
          })
        );
      }),
    })
  );
}

export const deleteQstashWithRetry = Effect.fn("Qstash.deleteWithRetry")(
  function* (scheduleId: string, attempts = 3) {
    const service = yield* QstashService;
    const totalAttempts = Number.isFinite(attempts)
      ? Math.max(1, Math.floor(attempts))
      : 3;
    yield* service.delete(scheduleId).pipe(
      Effect.retry({
        schedule: Schedule.addDelay(
          Schedule.recurs(totalAttempts - 1),
          (metadata) =>
            Effect.succeed(QSTASH_DELETE_RETRY_DELAY_MS * (metadata.output + 1))
        ),
        while: (error) =>
          error.kind === "transport" ||
          error.kind === "timeout" ||
          (error.kind === "http" &&
            error.status !== undefined &&
            (error.status === 408 ||
              error.status === 425 ||
              error.status === 429 ||
              error.status >= 500)),
      })
    );
  }
);
