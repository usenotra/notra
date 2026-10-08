import { BOX_BASE_URL } from "@notra/ai/constants/repo-image";
import { Cause, Effect, Exit, Schema } from "effect";
import {
  FetchHttpClient,
  Headers,
  HttpClient,
  HttpClientRequest,
} from "effect/http";

import {
  SANDBOX_CLEANUP_TIMEOUT_MS,
  SANDBOX_MAX_RESPONSE_BYTES,
  SANDBOX_REQUEST_TIMEOUT_MS,
} from "../constants/sandbox";
import {
  sandboxAllocationSchema,
  SandboxRequestError,
} from "../schemas/sandbox";
import { boundBuildLog } from "./bound-build-log";
import { redactBuildLog } from "./build-log";
import { readBodyUpToEffect } from "./read-body";

export const sandboxRequestEffect = Effect.fn("Sites.Sandbox.request")(
  function* (
    apiKey: string,
    operation: string,
    path: string,
    method: "GET" | "POST" | "DELETE",
    body?: string | FormData,
    maxBytes = SANDBOX_MAX_RESPONSE_BYTES,
    timeoutMs = SANDBOX_REQUEST_TIMEOUT_MS,
    onLateAllocation?: (
      id: string | null,
      cleaned: boolean,
      diagnostic?: string
    ) => void
  ) {
    const transport = yield* FetchHttpClient.Fetch;
    const redactedHeaders = yield* Headers.CurrentRedactedNames;
    const client = HttpClient.withScope(yield* HttpClient.HttpClient);
    let fetched: Response | undefined;
    let status: number | null = null;
    const failure = (message: string) =>
      new SandboxRequestError({ operation, status, message });
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        void fetched?.body?.cancel().catch(() => undefined);
      })
    );
    let request = HttpClientRequest.make(method)(
      `${BOX_BASE_URL}/v2/box/${path}`
    ).pipe(HttpClientRequest.setHeader("X-Box-Api-Key", apiKey));
    if (typeof body === "string") {
      request = HttpClientRequest.bodyText(request, body, "application/json");
    } else if (body) {
      request = HttpClientRequest.bodyFormData(request, body);
    }
    const response = yield* client.execute(request).pipe(
      Effect.provideService(Headers.CurrentRedactedNames, [
        ...redactedHeaders,
        "x-box-api-key",
      ]),
      Effect.provideService(FetchHttpClient.Fetch, async (input, init) => {
        try {
          const result = await transport(input, init);
          fetched = result;
          if (init?.signal?.aborted && onLateAllocation && result.ok) {
            let lateId: string | null = null;
            const recover = Effect.gen(function* () {
              const capped = yield* readBodyUpToEffect(
                result,
                SANDBOX_MAX_RESPONSE_BYTES
              );
              if (capped.exceeded) {
                return yield* Effect.fail(
                  failure("Late allocation response exceeds its size limit")
                );
              }
              const allocation = yield* Schema.decodeUnknownEffect(
                Schema.fromJsonString(sandboxAllocationSchema)
              )(new TextDecoder().decode(capped.bytes));
              lateId = allocation.id;
              const cleaned = yield* sandboxRequestEffect(
                apiKey,
                "cleanup",
                encodeURIComponent(allocation.id),
                "DELETE",
                undefined,
                SANDBOX_MAX_RESPONSE_BYTES,
                SANDBOX_CLEANUP_TIMEOUT_MS
              ).pipe(
                Effect.match({ onFailure: () => false, onSuccess: () => true })
              );
              onLateAllocation(allocation.id, cleaned);
            }).pipe(
              Effect.scoped,
              Effect.timeout(SANDBOX_CLEANUP_TIMEOUT_MS * 2),
              Effect.onExit((exit) =>
                Effect.sync(() => {
                  void result.body?.cancel().catch(() => undefined);
                  if (Exit.isFailure(exit)) {
                    onLateAllocation(
                      lateId,
                      false,
                      Cause.hasInterrupts(exit.cause)
                        ? "Late sandbox recovery was interrupted; its TTL still applies"
                        : "Late sandbox recovery failed; its TTL still applies"
                    );
                  }
                })
              )
            );
            void Effect.runPromiseExit(recover);
          } else if (init?.signal?.aborted) {
            void result.body?.cancel().catch(() => undefined);
          }
          return result;
        } catch (error) {
          throw failure(
            boundBuildLog(
              redactBuildLog(
                error instanceof Error
                  ? error.message
                  : "Sandbox request failed",
                [apiKey]
              )
            )
          );
        }
      }),
      Effect.mapError((error) =>
        failure(
          error.reason._tag === "TransportError" &&
            error.reason.cause instanceof SandboxRequestError
            ? error.reason.cause.message
            : "Sandbox request failed"
        )
      )
    );
    status = response.status;
    if (status < 200 || status >= 300) {
      return yield* Effect.fail(
        failure(`Sandbox rejected ${operation} (${status})`)
      );
    }
    if (!fetched) {
      return yield* Effect.fail(failure("Sandbox response is unavailable"));
    }
    const length = Number(fetched.headers.get("content-length") ?? 0);
    if (length > maxBytes) {
      return yield* Effect.fail(
        failure(`${path} is larger than allowed (${length} bytes)`)
      );
    }
    const capped = yield* readBodyUpToEffect(fetched, maxBytes).pipe(
      Effect.mapError(() => failure("Sandbox response could not be read"))
    );
    if (capped.exceeded) {
      return yield* Effect.fail(
        failure(`${path} is larger than allowed (${maxBytes} bytes)`)
      );
    }
    return capped.bytes;
  },
  (
    program,
    _apiKey: string,
    operation: string,
    _path: string,
    _method: "GET" | "POST" | "DELETE",
    _body?: string | FormData,
    _maxBytes?: number,
    timeoutMs: number = SANDBOX_REQUEST_TIMEOUT_MS,
    _onLateAllocation?: (
      id: string | null,
      cleaned: boolean,
      diagnostic?: string
    ) => void
  ) =>
    program.pipe(
      Effect.scoped,
      Effect.interruptible,
      Effect.timeoutOrElse({
        duration: timeoutMs,
        orElse: () =>
          Effect.fail(
            new SandboxRequestError({
              operation,
              status: null,
              message: `Sandbox ${operation} timed out`,
            })
          ),
      }),
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(FetchHttpClient.Fetch, globalThis.fetch)
    )
);

export const sandboxJsonEffect = Effect.fn("Sites.Sandbox.decode")(function* <
  A,
  I,
>(bytes: Uint8Array, schema: Schema.Codec<A, I>, operation: string) {
  return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(
    new TextDecoder().decode(bytes)
  ).pipe(
    Effect.mapError(
      () =>
        new SandboxRequestError({
          operation,
          status: null,
          message: `Sandbox returned an invalid ${operation} response`,
        })
    )
  );
});
