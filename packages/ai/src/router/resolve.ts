import type {
  FallbackReason,
  GatewayId,
  PlanLookup,
  ResolverContext,
  RouteDecision,
  RouteRequest,
  UsableAdapter,
  ZdrMode,
} from "@notra/ai/types/router";

import {
  GatewayCreditBalanceError,
  GatewayNotConfiguredError,
  GatewayUnavailableError,
  NoCompliantRouteError,
  UnsupportedModelError,
} from "./errors";
import { decideGateway, otherGateway } from "./policy";

export async function lookupPlan(
  context: ResolverContext,
  organizationId: string
): Promise<PlanLookup> {
  const cached = await context.planCache.get(organizationId);
  if (cached) {
    return { plan: cached, source: "cache" };
  }

  try {
    const plan = await context.resolvePlan(organizationId);
    await context.planCache.set(organizationId, plan, context.planCacheTtlMs);
    return { plan, source: "resolver" };
  } catch (error) {
    context.logger.warn("ai.router.plan_lookup_failed", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { plan: "free", source: "default" };
  }
}

/**
 * Resolve how strictly the request wants zero data retention. An explicit
 * caller choice wins; otherwise the organization's entitlement decides.
 * Requests without an organization and lookup failures fail closed.
 */
export async function lookupZdrMode(
  context: ResolverContext,
  request: RouteRequest
): Promise<ZdrMode> {
  if (request.zdr) {
    return request.zdr;
  }
  const { organizationId } = request;
  if (!organizationId) {
    return "required";
  }
  const cached = await context.zdrCache.get(organizationId);
  if (cached) {
    return cached;
  }
  try {
    const mode = await context.resolveZdr(organizationId);
    await context.zdrCache.set(organizationId, mode, context.planCacheTtlMs);
    return mode;
  } catch (error) {
    context.logger.warn("ai.router.zdr_lookup_failed", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "required";
  }
}

function getUsableAdapter(
  context: ResolverContext,
  gateway: GatewayId,
  modelId: string,
  organizationId: string | undefined
): UsableAdapter | { unavailable: FallbackReason } {
  const adapter = context.adapters[gateway];
  if (!adapter) {
    return { unavailable: "not-configured" };
  }
  if (!adapter.supportsModel(modelId)) {
    return { unavailable: "unsupported-model" };
  }
  const unavailableReason = context.credits.unavailableReason(gateway, modelId);
  if (unavailableReason) {
    return { unavailable: unavailableReason };
  }
  if (adapter.enforcesZdr) {
    return { adapter, zdrEnforced: true };
  }
  if (context.policy.allowNonZdr) {
    context.logger.warn("ai.router.zdr_bypassed", {
      gateway: adapter.id,
      modelId,
      organizationId,
    });
    return { adapter, zdrEnforced: false };
  }
  return { unavailable: "non-compliant" };
}

/**
 * A request that accepts non-ZDR routes may still use a gateway that is only
 * marked non-compliant for this model: the ZDR flag is dropped up front.
 */
function getRelaxedAdapter(
  context: ResolverContext,
  gateway: GatewayId,
  modelId: string,
  unavailable: FallbackReason
): UsableAdapter | undefined {
  const adapter = context.adapters[gateway];
  if (unavailable !== "non-compliant" || !adapter) {
    return undefined;
  }
  if (!adapter.supportsModel(modelId)) {
    return undefined;
  }
  const reason = context.credits.unavailableReason(gateway);
  if (reason) {
    return undefined;
  }
  return { adapter, zdrEnforced: false, zdrRelaxed: true };
}

function toDecision(
  candidate: UsableAdapter,
  request: RouteRequest,
  planLookup: PlanLookup | undefined,
  zdr: ZdrMode,
  reason: RouteDecision["reason"],
  fallback?: { from: GatewayId; reason: FallbackReason }
): RouteDecision {
  // `none` never sends the flag, so the route is relaxed from the start.
  const usable: UsableAdapter =
    zdr === "none"
      ? { adapter: candidate.adapter, zdrEnforced: false, zdrRelaxed: true }
      : candidate;
  return {
    gateway: usable.adapter.id,
    requestedModelId: request.modelId,
    modelId: usable.adapter.mapModelId(request.modelId),
    organizationId: request.organizationId,
    plan: planLookup?.plan,
    planSource: planLookup?.source,
    reason,
    ...(fallback
      ? { fallbackFrom: fallback.from, fallbackReason: fallback.reason }
      : {}),
    zdr,
    zdrEnforced: usable.zdrEnforced,
    ...(usable.zdrRelaxed ? { zdrRelaxed: true } : {}),
  };
}

function throwUnavailable(
  gateway: GatewayId,
  modelId: string,
  reason: FallbackReason
): never {
  if (reason === "not-configured") {
    throw new GatewayNotConfiguredError(gateway);
  }
  if (reason === "unsupported-model") {
    throw new UnsupportedModelError(gateway, modelId);
  }
  if (reason === "no-credits") {
    throw new GatewayCreditBalanceError(0, gateway);
  }
  if (reason === "auth-failure") {
    throw new GatewayUnavailableError(gateway, "authentication failed");
  }
  throw new NoCompliantRouteError(modelId, `${gateway}: ${reason}`);
}

/**
 * Pick the gateway for a request, verify the adapter can serve it and that
 * the route is privacy compliant. Falls back to the other gateway when the
 * preferred one is unavailable for the model. A `preferred` request that
 * finds no ZDR-capable route anywhere runs relaxed on a gateway that only
 * lacks a ZDR host for the model.
 */
export async function resolveRoute(
  context: ResolverContext,
  request: RouteRequest
): Promise<RouteDecision> {
  const { modelId, organizationId } = request;

  const [planLookup, zdr] = await Promise.all([
    organizationId && !request.gateway
      ? lookupPlan(context, organizationId)
      : Promise.resolve(undefined),
    lookupZdrMode(context, request),
  ]);

  const decision = decideGateway({
    policy: context.policy,
    organizationId,
    plan: planLookup?.plan,
    pinned: request.gateway,
  });

  const primary = getUsableAdapter(
    context,
    decision.gateway,
    modelId,
    organizationId
  );
  if ("adapter" in primary) {
    return toDecision(primary, request, planLookup, zdr, decision.reason);
  }

  const acceptsNonZdr = zdr !== "required";
  const canCrossGateway =
    context.policy.crossGatewayFallback && !request.gateway;
  if (!canCrossGateway) {
    // Pinned routes never move, and fallback can be disabled by injected test policies.
    const relaxed = acceptsNonZdr
      ? getRelaxedAdapter(
          context,
          decision.gateway,
          modelId,
          primary.unavailable
        )
      : undefined;
    if (relaxed) {
      logRelaxedRoute(context, decision.gateway, modelId, organizationId);
      return toDecision(relaxed, request, planLookup, zdr, decision.reason);
    }
    throwUnavailable(decision.gateway, modelId, primary.unavailable);
  }

  const fallbackGateway = otherGateway(decision.gateway);
  const secondary = getUsableAdapter(
    context,
    fallbackGateway,
    modelId,
    organizationId
  );
  if ("adapter" in secondary) {
    context.logger.info("ai.router.fallback", {
      from: decision.gateway,
      to: secondary.adapter.id,
      fallbackReason: primary.unavailable,
      modelId,
      organizationId,
    });
    return toDecision(secondary, request, planLookup, zdr, "fallback", {
      from: decision.gateway,
      reason: primary.unavailable,
    });
  }

  if (acceptsNonZdr) {
    const relaxedPrimary = getRelaxedAdapter(
      context,
      decision.gateway,
      modelId,
      primary.unavailable
    );
    if (relaxedPrimary) {
      logRelaxedRoute(context, decision.gateway, modelId, organizationId);
      return toDecision(
        relaxedPrimary,
        request,
        planLookup,
        zdr,
        decision.reason
      );
    }
    const relaxedSecondary = getRelaxedAdapter(
      context,
      fallbackGateway,
      modelId,
      secondary.unavailable
    );
    if (relaxedSecondary) {
      logRelaxedRoute(context, fallbackGateway, modelId, organizationId);
      return toDecision(
        relaxedSecondary,
        request,
        planLookup,
        zdr,
        "fallback",
        {
          from: decision.gateway,
          reason: primary.unavailable,
        }
      );
    }
  }

  if (
    primary.unavailable === "non-compliant" ||
    secondary.unavailable === "non-compliant"
  ) {
    context.logger.error("ai.router.no_compliant_route", {
      modelId,
      organizationId,
      primary: decision.gateway,
      primaryReason: primary.unavailable,
      secondaryReason: secondary.unavailable,
    });
    throw new NoCompliantRouteError(
      modelId,
      `${decision.gateway}: ${primary.unavailable}, ${fallbackGateway}: ${secondary.unavailable}`
    );
  }
  if (
    primary.unavailable === "not-configured" &&
    secondary.unavailable === "not-configured"
  ) {
    throw new GatewayNotConfiguredError("any");
  }
  if (primary.unavailable === "not-configured") {
    throwUnavailable(fallbackGateway, modelId, secondary.unavailable);
  }
  throwUnavailable(decision.gateway, modelId, primary.unavailable);
}

function logRelaxedRoute(
  context: ResolverContext,
  gateway: GatewayId,
  modelId: string,
  organizationId: string | undefined
): void {
  context.logger.warn("ai.router.zdr_bypassed", {
    gateway,
    modelId,
    organizationId,
    bypassReason: "caller-accepts-non-zdr",
  });
}
