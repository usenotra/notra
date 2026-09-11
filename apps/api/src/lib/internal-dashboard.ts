import {
  InternalDashboardAdapterError,
  InternalDashboardError,
  InternalDashboardTimeoutError,
} from "@notra/schemas/api/internal-dashboard";
import { internalWorkflowErrorResponseSchema } from "@notra/schemas/api/internal-workflow";
import { getVercelOidcToken } from "@vercel/oidc";
import { Config, Context, Effect, Layer, Redacted } from "effect";

import type {
  InternalDashboardDependencies,
  InternalDashboardOperations,
} from "../types/internal-dashboard";

export class InternalDashboardService extends Context.Service<
  InternalDashboardService,
  InternalDashboardOperations
>()("api/InternalDashboard") {}

export function internalDashboardLayer(deps: InternalDashboardDependencies) {
  return Layer.succeed(
    InternalDashboardService,
    InternalDashboardService.of({
      call: Effect.fn("InternalDashboard.call")(
        function* (url, payload, schema, timeoutMs) {
          const operation = Effect.acquireUseRelease(
            Effect.sync(() => new AbortController()),
            (controller) =>
              Effect.gen(function* () {
                const token = yield* deps.credentials;
                const response = yield* Effect.tryPromise({
                  try: (signal) =>
                    deps.request(url, {
                      method: "POST",
                      signal: AbortSignal.any([signal, controller.signal]),
                      headers: {
                        "content-type": "application/json",
                        ...(token ? { authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify(payload),
                    }),
                  catch: () =>
                    new InternalDashboardAdapterError({
                      kind: "transport",
                      message: "Internal dashboard request failed",
                    }),
                });
                if (!response.ok) {
                  const body = yield* Effect.tryPromise({
                    try: () => response.text(),
                    catch: () =>
                      new InternalDashboardAdapterError({
                        kind: "transport",
                        message: "Failed to read internal dashboard error",
                      }),
                  });
                  const parsed = yield* Effect.sync(() => {
                    try {
                      return internalWorkflowErrorResponseSchema.safeParse(
                        JSON.parse(body)
                      );
                    } catch {
                      return null;
                    }
                  });
                  return yield* Effect.fail(
                    new InternalDashboardError(
                      response.status,
                      parsed?.success ? (parsed.data.code ?? null) : null,
                      body
                    )
                  );
                }
                return yield* Effect.tryPromise({
                  try: async () => schema.parse(await response.json()),
                  catch: () =>
                    new InternalDashboardAdapterError({
                      kind: "decode",
                      message: "Invalid internal dashboard response",
                    }),
                });
              }),
            (controller) => Effect.sync(() => controller.abort())
          );
          return yield* timeoutMs === undefined
            ? operation
            : operation.pipe(
                Effect.timeoutOrElse({
                  duration: timeoutMs,
                  orElse: () =>
                    Effect.fail(new InternalDashboardTimeoutError(timeoutMs)),
                })
              );
        }
      ),
    })
  );
}

export const internalDashboardLive = internalDashboardLayer({
  request: (input, init) => fetch(input, init),
  credentials: Effect.gen(function* () {
    const secret = yield* Config.redacted("INTERNAL_WORKFLOW_SECRET").pipe(
      Config.withDefault(Redacted.make("")),
      Effect.map(Redacted.value),
      Effect.mapError(
        () =>
          new InternalDashboardAdapterError({
            kind: "configuration",
            message: "Failed to read internal dashboard configuration",
          })
      )
    );
    if (secret.trim()) {
      return secret.trim();
    }
    // Preserve unauthenticated fallback: the dashboard remains the authority
    // and returns its existing HTTP refusal when OIDC is unavailable.
    return yield* Effect.tryPromise({
      try: () => getVercelOidcToken(),
      catch: () =>
        new InternalDashboardAdapterError({
          kind: "authentication",
          message: "Internal dashboard credentials unavailable",
        }),
    }).pipe(Effect.catch(() => Effect.succeed(null)));
  }),
});
