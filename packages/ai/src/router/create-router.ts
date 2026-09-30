import type { SharedV4ProviderMetadata } from "@ai-sdk/provider";
import {
  DEFAULT_CREDIT_CHECK_TTL_MS,
  DEFAULT_PLAN_CACHE_TTL_MS,
  ROUTER_METADATA_KEY,
} from "@notra/ai/constants/router";
import type {
  ModelRouter,
  ModelRouterConfig,
  ResolverContext,
  RouteDecision,
  RouteMetadata,
  RouteRequest,
  RouterLogger,
} from "@notra/ai/types/router";

import { createCreditTracker } from "./credits";
import { GatewayCreditBalanceError } from "./errors";
import { RoutedLanguageModel } from "./lazy-model";
import { otherGateway } from "./policy";
import { resolveRoute } from "./resolve";
import { createMemoryTtlCache } from "./ttl-cache";

const noopLogger: RouterLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function isRouteMetadata(value: unknown): value is RouteMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.gateway === "string" &&
    typeof record.requestedModel === "string" &&
    typeof record.model === "string" &&
    typeof record.reason === "string"
  );
}

export function createModelRouter(config: ModelRouterConfig): ModelRouter {
  const logger = config.logger ?? noopLogger;
  const now = config.now ?? (() => Date.now());
  const credits = createCreditTracker(
    config.creditCheckTtlMs ?? DEFAULT_CREDIT_CHECK_TTL_MS,
    now
  );

  const context: ResolverContext = {
    adapters: config.adapters,
    policy: config.policy,
    resolvePlan: config.resolvePlan,
    resolveZdr: config.resolveZdr ?? (() => Promise.resolve("required")),
    planCache: config.planCache ?? createMemoryTtlCache(now),
    zdrCache: config.zdrCache ?? createMemoryTtlCache(now),
    planCacheTtlMs: config.planCacheTtlMs ?? DEFAULT_PLAN_CACHE_TTL_MS,
    logger,
    credits,
  };

  const resolve = (request: RouteRequest) => resolveRoute(context, request);

  const refreshBalance = async (decision: RouteDecision): Promise<void> => {
    const adapter = config.adapters[decision.gateway];
    if (!adapter || !credits.isStale(decision.gateway)) {
      return;
    }
    try {
      const { balance } = await adapter.getBalance();
      credits.record(decision.gateway, balance);
      logger.info("ai.router.credits", {
        gateway: decision.gateway,
        balance,
      });
    } catch (error) {
      // Balance lookups are best effort; unknown balance never blocks traffic.
      logger.warn("ai.router.credits_check_failed", {
        gateway: decision.gateway,
        error: error instanceof Error ? error.message : String(error),
      });
      credits.record(decision.gateway, null);
    }
  };

  const assertRouteHasCredits = async (
    request: RouteRequest
  ): Promise<RouteDecision> => {
    const decision = await resolve(request);
    await refreshBalance(decision);
    if (!credits.isExhausted(decision.gateway)) {
      return decision;
    }

    const balance = credits.snapshot(decision.gateway)?.balance ?? 0;
    const canFallback =
      config.policy.crossGatewayFallback &&
      !request.gateway &&
      config.adapters[otherGateway(decision.gateway)] !== undefined;
    if (!canFallback) {
      throw new GatewayCreditBalanceError(balance, decision.gateway);
    }

    // The resolver now treats the exhausted gateway as unavailable and
    // returns the compliant fallback (or throws when there is none).
    const fallback = await resolve(request);
    await refreshBalance(fallback);
    if (credits.isExhausted(fallback.gateway)) {
      throw new GatewayCreditBalanceError(
        credits.snapshot(fallback.gateway)?.balance ?? 0,
        fallback.gateway
      );
    }
    return fallback;
  };

  return {
    adapters: config.adapters,
    policy: config.policy,
    model(modelId, options) {
      return new RoutedLanguageModel({
        request: {
          modelId,
          organizationId: options?.organizationId,
          gateway: options?.gateway,
          zdr: options?.zdr,
        },
        policy: config.policy,
        adapters: config.adapters,
        logger,
        credits,
        resolve,
      });
    },
    resolveRoute: resolve,
    assertRouteHasCredits,
    getRouteMetadata(providerMetadata: SharedV4ProviderMetadata | undefined) {
      const value = providerMetadata?.[ROUTER_METADATA_KEY];
      return isRouteMetadata(value) ? value : undefined;
    },
    async enrichRouteMetadata(metadata) {
      const adapter = config.adapters[metadata.gateway];
      if (!metadata.generationId || !adapter?.lookupRouteMetadata) {
        return metadata;
      }
      try {
        const enriched = await adapter.lookupRouteMetadata(
          metadata.generationId
        );
        return { ...metadata, ...enriched };
      } catch (error) {
        logger.warn("ai.router.generation_lookup_failed", {
          gateway: metadata.gateway,
          generationId: metadata.generationId,
          error: error instanceof Error ? error.message : String(error),
        });
        return metadata;
      }
    },
  };
}
