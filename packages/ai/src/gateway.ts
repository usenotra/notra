import type { SharedV3ProviderMetadata } from "@ai-sdk/provider";
import { resolveOrganizationPlan } from "@notra/ai/billing/plan";
import { resolveOrganizationZdrMode } from "@notra/ai/billing/zdr";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import { ROUTER_POLICY } from "@notra/ai/constants/router";
import { log } from "@notra/ai/evlog";
import { createOpenRouterAdapter } from "@notra/ai/router/adapters/openrouter";
import { createVercelAdapter } from "@notra/ai/router/adapters/vercel";
import { createModelRouter } from "@notra/ai/router/create-router";
import type {
  GatewayArgs,
  GatewayModelOptions,
  GatewayResult,
} from "@notra/ai/types/gateway";
import type {
  GatewayAdapter,
  GatewayId,
  ModelRouter,
  RouteDecision,
  RouteMetadata,
  RouteRequest,
  RouterLogFields,
  RouterLogger,
} from "@notra/ai/types/router";

const APP_URL = "https://www.usenotra.com";
const APP_TITLE = "Notra";

const vercelHeaders = {
  "http-referer": APP_URL,
  "x-title": APP_TITLE,
};

const openRouterHeaders = {
  "HTTP-Referer": APP_URL,
  "X-Title": APP_TITLE,
};

let router: ModelRouter | null = null;

const routerLogger: RouterLogger = {
  info: (event: string, fields?: RouterLogFields) =>
    log.info({ event, ...fields }),
  warn: (event: string, fields?: RouterLogFields) =>
    log.warn({ event, ...fields }),
  error: (event: string, fields?: RouterLogFields) =>
    log.error({ event, ...fields }),
};

function buildAdapters(): Partial<Record<GatewayId, GatewayAdapter>> {
  const adapters: Partial<Record<GatewayId, GatewayAdapter>> = {};

  // On Vercel the gateway also authenticates via OIDC without an explicit key.
  const vercelApiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const hasVercelOidc =
    Boolean(process.env.VERCEL_OIDC_TOKEN) || process.env.VERCEL === "1";
  if (vercelApiKey || hasVercelOidc) {
    adapters.vercel = createVercelAdapter({
      apiKey: vercelApiKey || undefined,
      headers: vercelHeaders,
    });
  }

  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterApiKey) {
    adapters.openrouter = createOpenRouterAdapter({
      apiKey: openRouterApiKey,
      headers: openRouterHeaders,
    });
  }

  return adapters;
}

function createRouter(): ModelRouter {
  return createModelRouter({
    adapters: buildAdapters(),
    resolvePlan: resolveOrganizationPlan,
    resolveZdr: resolveOrganizationZdrMode,
    policy: ROUTER_POLICY,
    logger: routerLogger,
  });
}

/** Process-wide router singleton with the product's fixed routing policy. */
export function getModelRouter(): ModelRouter {
  router ??= createRouter();
  return router;
}

/**
 * Test/ops hook: replace the singleton (pass `null` to rebuild from env on
 * next access).
 */
export function setModelRouter(next: ModelRouter | null): void {
  router = next;
}

/**
 * Create a routed language model. Backwards compatible with the previous
 * Vercel-only `gateway(modelId)` signature: without options the route falls
 * back to the configured default gateway. Pass `organizationId` to route by
 * plan and `gateway` to pin a specific gateway.
 */
export const gateway = (...args: GatewayArgs): GatewayResult => {
  const [modelId, options] = args;
  return getModelRouter().model(modelId, options);
};

export function resolveModelRoute(
  request: RouteRequest
): Promise<RouteDecision> {
  return getModelRouter().resolveRoute(request);
}

/**
 * Route-aware credit check. Resolves the route the given request would take
 * and verifies the selected gateway still has credits. Falls back to the
 * other gateway when allowed and throws `GatewayCreditBalanceError` when no
 * funded route exists.
 */
export function assertRouteHasCredits(
  options: GatewayModelOptions & { modelId?: string } = {}
): Promise<RouteDecision> {
  return getModelRouter().assertRouteHasCredits({
    modelId: options.modelId ?? AGENT_DEFAULT_MODEL,
    organizationId: options.organizationId,
    gateway: options.gateway,
  });
}

export function getRouteMetadata(
  providerMetadata: SharedV3ProviderMetadata | undefined
): RouteMetadata | undefined {
  return getModelRouter().getRouteMetadata(providerMetadata);
}

export function enrichRouteMetadata(
  metadata: RouteMetadata
): Promise<RouteMetadata> {
  return getModelRouter().enrichRouteMetadata(metadata);
}
