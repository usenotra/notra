import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { createPerplexity } from "@ai-sdk/perplexity";
import { gateway } from "@notra/ai/gateway";
import { requireApiKey } from "@notra/utils/require-api-key";

import {
  GEO_ANTHROPIC_API_KEY_ENV,
  GEO_GROUNDED_MAX_SEARCHES,
  GEO_OPENAI_API_KEY_ENV,
  GEO_PERPLEXITY_API_KEY_ENV,
} from "../constants/geo";
import type {
  GeoGroundedEngine,
  GeoGroundedInvocation,
  GeoGroundedInvocationOptions,
} from "../types/geo";

export function buildGroundedInvocation(
  engine: GeoGroundedEngine,
  options: GeoGroundedInvocationOptions = {}
): GeoGroundedInvocation {
  // Provider-defined web search tools are only available through the Vercel
  // AI Gateway, so grounded engines are pinned to it.
  const groundedGateway = {
    organizationId: options.organizationId,
    gateway: "vercel",
    zdr: options.zdr,
  } as const;
  switch (engine.provider) {
    case "gateway-openai":
      return {
        model: gateway(engine.model, groundedGateway),
        tools: { web_search: openai.tools.webSearch({}) },
      };
    case "gateway-anthropic":
      return {
        model: gateway(engine.model, groundedGateway),
        tools: {
          web_search: anthropic.tools.webSearch_20250305({
            maxUses: GEO_GROUNDED_MAX_SEARCHES,
          }),
        },
      };
    case "gateway-google":
      return {
        model: gateway(engine.model, groundedGateway),
        tools: { google_search: google.tools.googleSearch({}) },
      };
    case "gateway-perplexity":
      return { model: gateway(engine.model, groundedGateway), tools: {} };
    case "direct-openai": {
      const provider = createOpenAI({
        apiKey: requireApiKey(GEO_OPENAI_API_KEY_ENV),
      });
      return {
        model: provider.responses(engine.model),
        tools: { web_search: provider.tools.webSearch({}) },
      };
    }
    case "direct-anthropic": {
      const provider = createAnthropic({
        apiKey: requireApiKey(GEO_ANTHROPIC_API_KEY_ENV),
      });
      return {
        model: provider(engine.model),
        tools: {
          web_search: provider.tools.webSearch_20250305({
            maxUses: GEO_GROUNDED_MAX_SEARCHES,
          }),
        },
      };
    }
    default: {
      const provider = createPerplexity({
        apiKey: requireApiKey(GEO_PERPLEXITY_API_KEY_ENV),
      });
      return { model: provider(engine.model), tools: {} };
    }
  }
}
