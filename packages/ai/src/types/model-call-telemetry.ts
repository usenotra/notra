import type {
  LanguageModelV4FinishReason,
  LanguageModelV4Usage,
} from "@ai-sdk/provider";
import type {
  ResolvedRoute,
  RouteRequest,
  RouterLogger,
} from "@notra/ai/types/router";

export interface ModelCallTelemetryOptions {
  logger: RouterLogger;
  request: RouteRequest;
  operation: "generate" | "stream";
  signal?: AbortSignal;
}

export interface ModelCallCompletion {
  usage: LanguageModelV4Usage;
  finishReason: LanguageModelV4FinishReason;
  responseId?: string;
}

export interface ModelCallTelemetry {
  attempt(route: ResolvedRoute): void;
  firstChunk(): void;
  complete(result: ModelCallCompletion): void;
  fail(error: unknown): void;
  abort(): void;
  incomplete(): void;
}
