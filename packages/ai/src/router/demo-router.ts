import { ROUTER_POLICY } from "@notra/ai/constants/router";
import { createDemoLanguageModel } from "@notra/ai/router/demo-model";
import type {
  ModelRouter,
  RouteDecision,
  RouteRequest,
} from "@notra/ai/types/router";

function demoDecision(request: RouteRequest): RouteDecision {
  return {
    gateway: "vercel",
    requestedModelId: request.modelId,
    modelId: request.modelId,
    organizationId: request.organizationId,
    reason: "pinned",
    zdr: "none",
    zdrEnforced: false,
  };
}

/**
 * Router for the public demo: every model id resolves to the in-process demo
 * model, and credit checks always pass. No gateway or provider is contacted.
 */
export function createDemoModelRouter(): ModelRouter {
  return {
    model: (modelId) => createDemoLanguageModel(modelId),
    resolveRoute: async (request) => demoDecision(request),
    assertRouteHasCredits: async (request) => demoDecision(request),
    getRouteMetadata: () => undefined,
    enrichRouteMetadata: async (metadata) => metadata,
    adapters: {},
    policy: ROUTER_POLICY,
  };
}
