import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
  SharedV4ProviderMetadata,
  SharedV4ProviderOptions,
} from "@ai-sdk/provider";
import type {
  ModelRouter,
  RouterLogger,
  RouterPolicyConfig,
} from "@notra/ai/types/router";
import type {
  FakeAdapter,
  FakeAdapterOptions,
  RecordedRouterCall,
  RouterTestLogEntry,
  TestRouterOptions,
} from "@notra/ai/types/router-test";

import { createModelRouter } from "./create-router";
import {
  buildOpenRouterProviderOptions,
  buildVercelProviderOptions,
} from "./provider-options";

export function createFakeAdapter(options: FakeAdapterOptions): FakeAdapter {
  const calls: RecordedRouterCall[] = [];
  const createdModels: string[] = [];
  const buildProviderOptions =
    options.id === "vercel"
      ? buildVercelProviderOptions
      : buildOpenRouterProviderOptions;
  const metadataKey = options.id === "vercel" ? "gateway" : "openrouter";

  const providerMetadata = (): SharedV4ProviderMetadata =>
    options.id === "vercel"
      ? {
          [metadataKey]: { generationId: "gen_test" },
        }
      : {
          [metadataKey]: {
            provider: options.upstreamProvider ?? "Amazon Bedrock",
          },
        };

  const createModel = (modelId: string): LanguageModelV4 => {
    createdModels.push(modelId);
    return {
      specificationVersion: "v4",
      provider: `fake-${options.id}`,
      modelId,
      supportedUrls: {},
      doGenerate(callOptions): Promise<LanguageModelV4GenerateResult> {
        const call = { gateway: options.id, modelId, options: callOptions };
        calls.push(call);
        options.onCall?.(call);
        return Promise.resolve({
          content: [{ type: "text", text: `${options.id}:${modelId}` }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
          },
          warnings: [],
          providerMetadata: providerMetadata(),
        });
      },
      doStream(callOptions): Promise<LanguageModelV4StreamResult> {
        const call = { gateway: options.id, modelId, options: callOptions };
        calls.push(call);
        options.onCall?.(call);
        const parts: LanguageModelV4StreamPart[] = [
          { type: "stream-start", warnings: [] },
          {
            type: "text-start",
            id: "t",
            ...(options.id === "vercel"
              ? { providerMetadata: providerMetadata() }
              : {}),
          },
          { type: "text-delta", id: "t", delta: `${options.id}:${modelId}` },
          { type: "text-end", id: "t" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: "stop" },
            usage: {
              inputTokens: {
                total: 1,
                noCache: 1,
                cacheRead: 0,
                cacheWrite: 0,
              },
              outputTokens: { total: 1, text: 1, reasoning: 0 },
            },
            ...(options.id === "openrouter"
              ? { providerMetadata: providerMetadata() }
              : {}),
          },
        ];
        return Promise.resolve({
          stream: new ReadableStream<LanguageModelV4StreamPart>({
            start(controller) {
              for (const part of parts) {
                controller.enqueue(part);
              }
              controller.close();
            },
          }),
        });
      },
    };
  };

  const adapter: FakeAdapter = {
    id: options.id,
    enforcesZdr: options.enforcesZdr ?? true,
    calls,
    createdModels,
    balanceCalls: 0,
    supportsModel: options.supportedModels ?? (() => true),
    mapModelId: (modelId) => modelId,
    createModel,
    buildProviderOptions,
    checkHealth: () => Promise.resolve({ ok: true }),
    getBalance() {
      adapter.balanceCalls += 1;
      return Promise.resolve({
        balance: options.balance ?? 100,
      });
    },
    extractRouteMetadata(metadata) {
      const block = metadata?.[metadataKey] as
        | Record<string, unknown>
        | undefined;
      if (!block) {
        return {};
      }
      if (options.id === "vercel") {
        return { generationId: block.generationId as string | undefined };
      }
      return {
        upstreamProvider: block.provider as string | undefined,
      };
    },
    ...(options.id === "vercel"
      ? {
          lookupRouteMetadata: () =>
            Promise.resolve({
              model: "anthropic/claude-sonnet-4.6",
              upstreamProvider: options.upstreamProvider ?? "anthropic",
            }),
        }
      : {}),
  };
  return adapter;
}

export function createCaptureLogger(): RouterLogger & {
  entries: RouterTestLogEntry[];
} {
  const entries: RouterTestLogEntry[] = [];
  return {
    entries,
    info: (event, fields) => {
      entries.push({ level: "info", event, fields });
    },
    warn: (event, fields) => {
      entries.push({ level: "warn", event, fields });
    },
    error: (event, fields) => {
      entries.push({ level: "error", event, fields });
    },
  };
}

export function createPolicy(
  overrides: Partial<RouterPolicyConfig> = {}
): RouterPolicyConfig {
  return {
    defaultGateway: "openrouter",
    paidGateway: "vercel",
    freeGateway: "openrouter",
    allowNonZdr: false,
    crossGatewayFallback: true,
    ...overrides,
  };
}

export function createTestRouter(options: TestRouterOptions = {}): {
  router: ModelRouter;
  vercel: FakeAdapter | undefined;
  openrouter: FakeAdapter | undefined;
  logger: ReturnType<typeof createCaptureLogger>;
  planLookups: string[];
} {
  const vercel =
    options.vercel === null
      ? undefined
      : (options.vercel ?? createFakeAdapter({ id: "vercel" }));
  const openrouter =
    options.openrouter === null
      ? undefined
      : (options.openrouter ?? createFakeAdapter({ id: "openrouter" }));
  const logger = createCaptureLogger();
  const planLookups: string[] = [];
  const plans = options.plans ?? {};

  const router = createModelRouter({
    adapters: {
      ...(vercel ? { vercel } : {}),
      ...(openrouter ? { openrouter } : {}),
    },
    resolvePlan:
      options.resolvePlan ??
      ((organizationId) => {
        planLookups.push(organizationId);
        return Promise.resolve(plans[organizationId] ?? "free");
      }),
    resolveZdr: options.resolveZdr,
    policy: createPolicy(options.policy),
    logger,
    now: options.now,
    planCacheTtlMs: options.planCacheTtlMs,
    creditCheckTtlMs: options.creditCheckTtlMs,
  });

  return { router, vercel, openrouter, logger, planLookups };
}

export function callOptions(
  providerOptions?: SharedV4ProviderOptions
): LanguageModelV4CallOptions {
  return {
    prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    ...(providerOptions ? { providerOptions } : {}),
  };
}

export function httpError(statusCode: number, message = "upstream failed") {
  const error = new Error(message) as Error & {
    statusCode: number;
    isRetryable: boolean;
  };
  error.name = "APICallError";
  error.statusCode = statusCode;
  error.isRetryable = statusCode >= 500 || statusCode === 429;
  return error;
}

export async function readStreamParts(
  result: LanguageModelV4StreamResult
): Promise<LanguageModelV4StreamPart[]> {
  const parts: LanguageModelV4StreamPart[] = [];
  const reader = result.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    parts.push(value);
  }
  return parts;
}
