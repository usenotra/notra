import { randomUUID } from "node:crypto";

import { gateway } from "@notra/ai/gateway";
import {
  type AILogTarget,
  wrapModelWithObservability,
} from "@notra/ai/observability";
import type { GatewayArgs, GatewayResult } from "@notra/ai/types/gateway";
import type { SupermemoryOptions } from "@notra/ai/types/model";
import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { type LanguageModelMiddleware, wrapLanguageModel } from "ai";

export interface CreateModelOptions {
  supermemory?: Omit<SupermemoryOptions, "mode" | "addMemory">;
  disableMemory?: boolean;
}

type DevToolsMiddleware =
  (typeof import("@ai-sdk/devtools"))["devToolsMiddleware"];

export function createModel(
  organizationId: string | undefined,
  modelId: GatewayArgs[0],
  options?: CreateModelOptions,
  log?: AILogTarget
): GatewayResult {
  const base = gateway(modelId, { organizationId });

  if (!organizationId || options?.disableMemory) {
    return wrapModelForDevTools(wrapModelWithObservability(base, log));
  }

  const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY?.trim();
  if (!supermemoryApiKey) {
    return wrapModelForDevTools(wrapModelWithObservability(base, log));
  }

  // @supermemory/tools is typed against AI SDK 5/6, but its wrapper is a Proxy
  // that forwards the V4 model spec and stream parts unchanged.
  const model = withSupermemory(base as never, {
    apiKey: supermemoryApiKey,
    mode: "full",
    addMemory: "always",
    ...options?.supermemory,
    containerTag: organizationId,
    customId: options?.supermemory?.customId ?? randomUUID(),
  }) as unknown as GatewayResult;

  return wrapModelForDevTools(wrapModelWithObservability(model, log));
}

function wrapModelForDevTools(model: GatewayResult): GatewayResult {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.AI_SDK_DEVTOOLS !== "true"
  ) {
    return model;
  }

  return wrapLanguageModel({
    model,
    middleware: createLazyDevToolsMiddleware(),
  }) as GatewayResult;
}

function createLazyDevToolsMiddleware(): LanguageModelMiddleware {
  let middlewarePromise: Promise<LanguageModelMiddleware> | undefined;

  const getMiddleware = async () => {
    // Next.js must be able to eliminate this import from the workflow bundle.
    if (process.env.NODE_ENV !== "development") {
      return undefined;
    }

    middlewarePromise ??= import("@ai-sdk/devtools").then(
      ({ devToolsMiddleware }: { devToolsMiddleware: DevToolsMiddleware }) =>
        devToolsMiddleware()
    );
    return middlewarePromise;
  };

  return {
    specificationVersion: "v4",
    async transformParams(options) {
      const middleware = await getMiddleware();
      return middleware?.transformParams
        ? middleware.transformParams(options)
        : options.params;
    },
    async wrapGenerate(options) {
      const middleware = await getMiddleware();
      return middleware?.wrapGenerate
        ? middleware.wrapGenerate(options)
        : options.doGenerate();
    },
    async wrapStream(options) {
      const middleware = await getMiddleware();
      return middleware?.wrapStream
        ? middleware.wrapStream(options)
        : options.doStream();
    },
  };
}
