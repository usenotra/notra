// Deliberately exclude prompts, outputs, URLs, headers, emails and error text.
export const TELEMETRY_EVENT_FIELDS = [
  "timestamp",
  "level",
  "service",
  "environment",
  "version",
  "region",
  "event",
  "requestId",
  "callId",
  "costId",
  "generationId",
  "organizationId",
  "userId",
  "siteId",
  "projectId",
  "integrationId",
  "toolId",
  "feature",
  "surface",
  "method",
  "routeId",
  "status",
  "outcome",
  "errorKind",
  "durationMs",
  "weight",
  "runtime",
  "model",
  "requestedModel",
  "gateway",
  "upstreamProvider",
  "provider",
  "operation",
  "attemptCount",
  "fallbackFrom",
  "fallbackReason",
  "costUsd",
  "gatewayCostUsd",
  "byokInferenceCostUsd",
  "isByok",
  "balance",
  "traceId",
  "spanId",
] as const;

// These fields can include caller-supplied identifiers, never arbitrary text.
export const TELEMETRY_IDENTIFIER_FIELDS = new Set([
  "requestId",
  "callId",
  "costId",
  "generationId",
  "organizationId",
  "userId",
  "siteId",
  "projectId",
  "integrationId",
  "toolId",
  "traceId",
  "spanId",
]);
export const TELEMETRY_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
export const TELEMETRY_JWT_PATTERN =
  /(?:^|:)[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*(?:$|:)/;

export const TELEMETRY_NUMBER_FIELDS = new Set([
  "durationMs",
  "weight",
  "attemptCount",
  "costUsd",
  "gatewayCostUsd",
  "byokInferenceCostUsd",
  "balance",
  "calls",
  "inputTokens",
  "outputTokens",
  "totalTokens",
  "cacheReadTokens",
  "cacheWriteTokens",
  "reasoningTokens",
  "msToFinish",
  "msToFirstChunk",
]);
export const TELEMETRY_INTEGER_FIELDS = new Set([
  "weight",
  "attemptCount",
  "calls",
  "inputTokens",
  "outputTokens",
  "totalTokens",
  "cacheReadTokens",
  "cacheWriteTokens",
  "reasoningTokens",
]);
export const TELEMETRY_PROVIDERS = new Set([
  "openai",
  "anthropic",
  "google",
  "azure",
  "bedrock",
  "amazon-bedrock",
  "aws-bedrock",
  "together",
  "togetherai",
  "fireworks",
  "deepinfra",
  "groq",
  "cohere",
  "mistral",
  "perplexity",
  "xai",
  "alibaba",
  "qwen",
  "moonshotai",
  "zai",
  "deepseek",
  "cerebras",
  "sambanova",
  "novita",
  "baseten",
  "nebius",
  "lambda",
  "chutes",
  "inference.net",
  "openrouter",
  "vercel",
  "other",
]);
export const TELEMETRY_INTEGRATION_PROVIDERS = new Set([
  ...TELEMETRY_PROVIDERS,
  "context.dev",
]);
export const TELEMETRY_MODEL_NAMESPACES = new Set([
  ...TELEMETRY_PROVIDERS,
  "meta",
  "spacexai",
]);
export const TELEMETRY_UPSTREAM_PROVIDERS = new Set(TELEMETRY_PROVIDERS);
// Reviewed aliases only: never lowercase or sanitize arbitrary provider text.
export const TELEMETRY_PROVIDER_ALIASES: Readonly<Record<string, string>> = {
  "Context.dev": "context.dev",
};
export const TELEMETRY_UPSTREAM_PROVIDER_ALIASES: Readonly<
  Record<string, string>
> = {
  "Amazon Bedrock": "amazon-bedrock",
  "AWS Bedrock": "aws-bedrock",
  Anthropic: "anthropic",
  OpenAI: "openai",
  Google: "google",
  "Google Vertex": "google",
};
export const TELEMETRY_MODEL_PATTERN =
  /^(?:[a-z][a-z0-9.-]*\/)?(?:gpt-|o[1-9](?:[-.]|$)|claude-|gemini-|gemma-|qwen|llama|deepseek|mistral|ministral|command-|sonar|grok|glm|kimi|nova-|phi-|notra-demo)[a-zA-Z0-9_.:-]*$/;
export const TELEMETRY_ENUM_FIELDS: Readonly<
  Record<string, ReadonlySet<string>>
> = {
  level: new Set(["debug", "info", "warn", "error", "fatal", "trace"]),
  method: new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  finishReason: new Set([
    "stop",
    "length",
    "content-filter",
    "tool-calls",
    "error",
    "other",
    "unknown",
  ]),
  gateway: new Set(["vercel", "openrouter", "direct"]),
  fallbackFrom: new Set(["vercel", "openrouter"]),
  fallbackReason: new Set([
    "not-configured",
    "unsupported-model",
    "no-credits",
    "auth-failure",
    "upstream-error",
    "non-compliant",
  ]),
  serviceTier: new Set([
    "auto",
    "default",
    "standard",
    "flex",
    "priority",
    "scale",
  ]),
  operation: new Set(["generate", "stream"]),
  errorKind: new Set([
    "client_error",
    "server_error",
    "transport_error",
    "operation_error",
    "tool_error",
    "cancelled",
  ]),
  environment: new Set([
    "production",
    "preview",
    "development",
    "validation",
    "test",
  ]),
  provider: TELEMETRY_INTEGRATION_PROVIDERS,
  upstreamProvider: TELEMETRY_UPSTREAM_PROVIDERS,
  runtime: new Set(["bun", "node", "nodejs", "workers", "edge"]),
  outcome: new Set([
    "success",
    "error",
    "failed",
    "completed",
    "aborted",
    "incomplete",
    "accepted",
    "rejected",
    "dropped",
    "running",
    "cancelled",
  ]),
};
export const TELEMETRY_CODE_FIELDS = new Set([
  "service",
  "version",
  "region",
  "event",
  "feature",
  "surface",
]);
export const TELEMETRY_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
// Framework route templates, not URLs, query strings or arbitrary request paths.
export const TELEMETRY_ROUTE_SENTINELS = new Set(["unmatched"]);
export const TELEMETRY_ROUTE_SEGMENT_PATTERN =
  /^(?:[A-Za-z0-9_][A-Za-z0-9_.-]*|\.[A-Za-z][A-Za-z0-9_.-]*|[:$][A-Za-z_][A-Za-z0-9_]*|\$|\*|\[\[\.\.\.[A-Za-z_][A-Za-z0-9_]*\]\]|\[(?:\.\.\.)?[A-Za-z_][A-Za-z0-9_]*\])$/;
export const TELEMETRY_SECRET_PATTERN =
  /(?:^|[/.:_-])(?:sk[-_]|bearer|password|secret|token[-_]|axiom[-_])/i;

// Only geo.ingest has reviewed reason codes; other events may use free text.
export const TELEMETRY_GEO_INGEST_REASONS = new Set([
  "missing_token",
  "invalid_token",
  "rate_limited",
  "invalid_payload",
  "invalid_url",
  "failed",
  "defect",
  "visitor_type",
  "host",
  "site",
  "not_site",
  "web_rate_limited",
]);

const GEO_INGEST_RUNTIMES = new Set(["railway", "vercel", "local"]);
export const TELEMETRY_EVENT_ENUM_FIELDS: Readonly<
  Record<string, Readonly<Record<string, ReadonlySet<string>>>>
> = {
  "geo.ingest": {
    outcome: new Set(["ingested", "dropped", "rejected", "failed"]),
    runtime: GEO_INGEST_RUNTIMES,
    reason: TELEMETRY_GEO_INGEST_REASONS,
  },
  "geo.ingest.flush": {
    outcome: new Set(["written", "partial", "rejected", "failed"]),
    runtime: GEO_INGEST_RUNTIMES,
  },
  "geo.ingest.runtime": { runtime: GEO_INGEST_RUNTIMES },
};

// Only geo.ingest.runtime emits these reviewed nonnegative numeric fields.
export const TELEMETRY_GEO_INGEST_RUNTIME_FIELDS = [
  "uptimeSeconds",
  "rssBytes",
  "heapUsedBytes",
  "externalBytes",
  "activeRequests",
  "pendingTasks",
  "bufferedEvents",
  "databaseConnections",
  "databaseIdleConnections",
  "databaseWaitingRequests",
] as const;

export const TELEMETRY_GEO_INGEST_RUNTIME_COUNT_FIELDS = new Set([
  "activeRequests",
  "pendingTasks",
  "bufferedEvents",
  "databaseConnections",
  "databaseIdleConnections",
  "databaseWaitingRequests",
]);

export const TELEMETRY_AI_FIELDS = [
  "calls",
  "model",
  "inputTokens",
  "outputTokens",
  "totalTokens",
  "cacheReadTokens",
  "cacheWriteTokens",
  "reasoningTokens",
  "costUsd",
  "gatewayCostUsd",
  "byokInferenceCostUsd",
  "msToFinish",
  "msToFirstChunk",
  "finishReason",
  "serviceTier",
] as const;
