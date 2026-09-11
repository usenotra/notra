import type {
  ModelCallTelemetry,
  ModelCallTelemetryOptions,
} from "@notra/ai/types/model-call-telemetry";
import type { ResolvedRoute, RouterLogFields } from "@notra/ai/types/router";

/** One lifecycle per SDK model invocation, including any router fallback. */
export function createModelCallTelemetry({
  logger,
  request,
  operation,
  signal,
}: ModelCallTelemetryOptions): ModelCallTelemetry {
  const callId = crypto.randomUUID();
  const startedAt = performance.now();
  let route: ResolvedRoute | undefined;
  let attemptCount = 0;
  let msToFirstChunk: number | undefined;
  let finished = false;

  function emit(
    level: "info" | "warn" | "error",
    event: string,
    fields: RouterLogFields = {}
  ) {
    try {
      logger[level](event, {
        callId,
        operation,
        organizationId: request.organizationId,
        requestedModel: request.modelId,
        model: route?.decision.modelId ?? request.modelId,
        gateway: route?.decision.gateway ?? request.gateway,
        attemptCount,
        fallbackFrom: route?.decision.fallbackFrom,
        fallbackReason: route?.decision.fallbackReason,
        zdrEnforced: route?.decision.zdrEnforced,
        zdrRelaxed: route?.decision.zdrRelaxed,
        ...fields,
      });
    } catch {
      // Observability must not turn a provider success into a retry or failure.
    }
  }

  function finish(
    level: "info" | "warn" | "error",
    event: string,
    ai: Record<string, string | number | undefined> = {},
    fields: RouterLogFields = {}
  ) {
    if (finished) {
      return;
    }
    finished = true;
    signal?.removeEventListener("abort", abort);
    const durationMs = Math.round(performance.now() - startedAt);
    emit(level, event, {
      durationMs,
      ai: {
        model: route?.decision.modelId ?? request.modelId,
        msToFinish: durationMs,
        msToFirstChunk,
        ...ai,
      },
      ...fields,
    });
  }

  function abort() {
    finish("warn", "ai.call.aborted");
  }

  emit("info", "ai.call.started");
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) {
    abort();
  }

  return {
    attempt(nextRoute) {
      route = nextRoute;
      attemptCount += 1;
    },
    firstChunk() {
      msToFirstChunk ??= Math.round(performance.now() - startedAt);
    },
    complete(result) {
      if (finished) {
        return;
      }
      const inputTokens = result.usage.inputTokens.total;
      const outputTokens = result.usage.outputTokens.total;
      const failed = result.finishReason.unified === "error";
      finish(
        failed ? "error" : "info",
        failed ? "ai.call.failed" : "ai.call.completed",
        {
          inputTokens,
          outputTokens,
          totalTokens:
            inputTokens !== undefined && outputTokens !== undefined
              ? inputTokens + outputTokens
              : undefined,
          cacheReadTokens: result.usage.inputTokens.cacheRead,
          reasoningTokens: result.usage.outputTokens.reasoning,
          finishReason: result.finishReason.unified,
          responseId: result.responseId,
        },
        failed ? { error: "Provider returned an error finish reason" } : {}
      );
    },
    fail(error) {
      if (
        signal?.aborted ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        abort();
        return;
      }
      finish(
        "error",
        "ai.call.failed",
        {},
        {
          errorName: error instanceof Error ? error.name : typeof error,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    },
    abort,
    incomplete() {
      finish(
        "warn",
        "ai.call.incomplete",
        {},
        {
          error: "Stream closed without a finish event",
        }
      );
    },
  };
}
