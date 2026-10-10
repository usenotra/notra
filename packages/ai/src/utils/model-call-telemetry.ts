import { ROUTER_METADATA_KEY } from "@notra/ai/constants/router";
import type {
  ModelCallTelemetry,
  ModelCallTelemetryOptions,
} from "@notra/ai/types/model-call-telemetry";
import type { ResolvedRoute, RouterLogFields } from "@notra/ai/types/router";
import { getOperationalContext } from "@notra/ai/utils/operational-context";
import { recordRequestAIUsage } from "@notra/ai/utils/request-ai-usage";

/** One lifecycle per SDK model invocation, including any router fallback. */
export function createModelCallTelemetry({
  logger,
  request,
  operation,
  signal,
  providerOptions,
}: ModelCallTelemetryOptions): ModelCallTelemetry {
  const callId = crypto.randomUUID();
  const context = { ...getOperationalContext(), ...request.logContext };
  const tags = providerOptions?.gateway?.tags;
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
        ...context,
        requestId: context.requestId ?? callId,
        ...(Array.isArray(tags)
          ? { tags: tags.filter((tag) => typeof tag === "string") }
          : {}),
        callId,
        operation,
        organizationId: request.organizationId ?? context.organizationId,
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
      const serviceTier =
        result.providerMetadata?.gateway?.serviceTier ??
        result.providerMetadata?.openai?.serviceTier;
      const failed = result.finishReason.unified === "error";
      const generationId =
        result.providerMetadata?.[ROUTER_METADATA_KEY]?.generationId;
      const routeMetadata = result.providerMetadata?.[ROUTER_METADATA_KEY];
      recordRequestAIUsage({
        model: route?.decision.modelId ?? request.modelId,
        inputTokens,
        outputTokens,
        cacheReadTokens: result.usage.inputTokens.cacheRead,
        cacheWriteTokens: result.usage.inputTokens.cacheWrite,
        reasoningTokens: result.usage.outputTokens.reasoning,
        providerMetadata: result.providerMetadata,
      });
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
          cacheWriteTokens: result.usage.inputTokens.cacheWrite,
          serviceTier:
            typeof serviceTier === "string" ? serviceTier : undefined,
          reasoningTokens: result.usage.outputTokens.reasoning,
          finishReason: result.finishReason.unified,
          ...(typeof routeMetadata?.costUsd === "number"
            ? { costUsd: routeMetadata.costUsd }
            : {}),
          responseId:
            result.responseId ??
            (typeof generationId === "string" ? generationId : undefined),
        },
        {
          ...(typeof generationId === "string" ? { generationId } : {}),
          upstreamProvider:
            typeof routeMetadata?.upstreamProvider === "string"
              ? routeMetadata.upstreamProvider
              : undefined,
          gatewayCostUsd:
            typeof routeMetadata?.gatewayCostUsd === "number"
              ? routeMetadata.gatewayCostUsd
              : undefined,
          upstreamInferenceCostUsd:
            typeof routeMetadata?.upstreamInferenceCostUsd === "number"
              ? routeMetadata.upstreamInferenceCostUsd
              : undefined,
          isByok:
            typeof routeMetadata?.isByok === "boolean"
              ? routeMetadata.isByok
              : undefined,
          costSource:
            typeof routeMetadata?.costSource === "string"
              ? routeMetadata.costSource
              : undefined,
          ...(failed
            ? { error: "Provider returned an error finish reason" }
            : {}),
        }
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
