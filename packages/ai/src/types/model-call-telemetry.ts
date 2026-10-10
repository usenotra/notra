import type {
  LanguageModelV4FinishReason,
  LanguageModelV4Usage,
  SharedV4ProviderMetadata,
  SharedV4ProviderOptions,
} from "@ai-sdk/provider";
import type {
  GatewayAdapter,
  ResolvedRoute,
  RouteRequest,
  RouterLogger,
} from "@notra/ai/types/router";

export interface ModelCallTelemetryOptions {
  logger: RouterLogger;
  request: RouteRequest;
  operation: "generate" | "stream" | "evaluate";
  signal?: AbortSignal;
  providerOptions?: SharedV4ProviderOptions;
  lookupRouteMetadata?: GatewayAdapter["lookupRouteMetadata"];
}

export interface ModelCallCompletion {
  usage: LanguageModelV4Usage;
  finishReason: LanguageModelV4FinishReason;
  responseId?: string;
  providerMetadata?: SharedV4ProviderMetadata;
}

export interface ModelCallTelemetry {
  attempt(route?: ResolvedRoute): void;
  firstChunk(): void;
  complete(result: ModelCallCompletion): void;
  fail(error: unknown): void;
  abort(): void;
  incomplete(): void;
}
