import type {
  LanguageModelV3FinishReason,
  LanguageModelV3Usage,
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
  usage: LanguageModelV3Usage;
  finishReason: LanguageModelV3FinishReason;
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
