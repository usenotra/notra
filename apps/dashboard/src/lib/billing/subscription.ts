import {
  allowUnmeteredAiInDevelopment,
  autumn,
  AUTUMN_READ_TIMEOUT_MS,
} from "@notra/ai/billing/autumn";
import { FEATURES, PAID_OR_LEGACY_PLAN_IDS } from "@notra/ai/billing/features";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { ORPCError } from "@orpc/server";
import { Cache, Duration, Effect, Exit } from "effect";

import {
  ENTITLEMENT_FEATURES,
  ENTITLEMENT_SURFACES,
} from "@/constants/analytics-events";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { getTranslations } from "@/lib/i18n/server";
import { getORPCRequestMemo } from "@/lib/orpc/context";
import { internalServerError, paymentRequired } from "@/lib/orpc/utils/errors";

/**
 * Positive billing answers are reused across requests for a minute: every
 * GEO batch and dashboard render otherwise waits on an Autumn round trip.
 * Denials and provider failures are never cached, so an upgrade applies on the
 * next request; a cancellation takes up to the TTL to apply. Concurrent checks
 * for one organization share a single lookup.
 */
const GRANTED_ACCESS_TTL = Duration.minutes(1);
const GRANTED_ACCESS_CACHE_CAPACITY = 10_000;

const checkAiAnswersEntitlement = async (organizationId: string) => {
  if (!autumn) {
    return null;
  }

  return await autumn.check(
    {
      customerId: organizationId,
      featureId: FEATURES.AI_ANSWERS,
    },
    { timeoutMs: AUTUMN_READ_TIMEOUT_MS }
  );
};

const geoEntitlementCache = Effect.runSync(
  Cache.makeWith(
    (organizationId: string) =>
      Effect.tryPromise({
        try: async (): Promise<"entitled" | "denied"> => {
          const data = await checkAiAnswersEntitlement(organizationId);
          return data?.balance == null ? "denied" : "entitled";
        },
        catch: (cause) => cause,
      }),
    {
      capacity: GRANTED_ACCESS_CACHE_CAPACITY,
      timeToLive: (exit) =>
        Exit.isSuccess(exit) && exit.value === "entitled"
          ? GRANTED_ACCESS_TTL
          : Duration.zero,
    }
  )
);

async function hasAiCreditsBalance(organizationId: string): Promise<boolean> {
  if (!autumn) {
    return false;
  }

  const data = await autumn.check(
    {
      customerId: organizationId,
      featureId: FEATURES.AI_CREDITS,
      requiredBalance: 1,
    },
    { timeoutMs: AUTUMN_READ_TIMEOUT_MS }
  );

  return data.allowed === true;
}

export async function hasAiCreditsGrant(
  organizationId: string
): Promise<boolean> {
  if (!autumn) {
    return false;
  }

  const data = await autumn.check(
    {
      customerId: organizationId,
      featureId: FEATURES.AI_CREDITS,
    },
    { timeoutMs: AUTUMN_READ_TIMEOUT_MS }
  );

  return data.balance != null;
}

async function lookupAiProductAccess(organizationId: string) {
  if (!autumn) {
    return { hasAccess: true, activePlanId: null };
  }

  const customer = await autumn.customers.getOrCreate({
    customerId: organizationId,
  });

  const activePlanId =
    customer.subscriptions.find(
      (subscription) => !subscription.addOn && subscription.status === "active"
    )?.planId ?? null;

  const hasPaidPlan = customer.subscriptions.some(
    (subscription) =>
      !subscription.addOn &&
      subscription.status === "active" &&
      PAID_OR_LEGACY_PLAN_IDS.has(subscription.planId)
  );

  return {
    hasAccess: hasPaidPlan || (await hasAiCreditsBalance(organizationId)),
    activePlanId,
  };
}

const aiProductAccessCache = Effect.runSync(
  Cache.makeWith(
    (organizationId: string) =>
      Effect.tryPromise({
        try: () => lookupAiProductAccess(organizationId),
        catch: (cause) => cause,
      }),
    {
      capacity: GRANTED_ACCESS_CACHE_CAPACITY,
      timeToLive: (exit) =>
        Exit.isSuccess(exit) && exit.value.hasAccess
          ? GRANTED_ACCESS_TTL
          : Duration.zero,
    }
  )
);

export async function resolveAiProductAccess(organizationId: string) {
  if (allowUnmeteredAiInDevelopment) {
    return { hasAccess: true, activePlanId: null };
  }

  if (!autumn) {
    if (process.env.NODE_ENV === "production") {
      throw internalServerError("Billing is not configured");
    }
    return { hasAccess: true, activePlanId: null };
  }

  try {
    return await Effect.runPromise(
      Cache.get(aiProductAccessCache, organizationId)
    );
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }
    throw internalServerError("Failed to verify subscription status");
  }
}

export async function assertActiveSubscription(
  organizationId: string,
  procedure?: string
): Promise<void> {
  const { hasAccess, activePlanId } =
    await resolveAiProductAccess(organizationId);

  if (!hasAccess) {
    trackServerEvent({
      event: POSTHOG_EVENTS.SUBSCRIPTION_REQUIRED_HIT,
      organizationId,
      properties: { procedure: procedure ?? null, plan_id: activePlanId },
    });
    const tErrors = await getTranslations("errors.billing");
    throw paymentRequired(tErrors("subscriptionRequired"));
  }
}

export async function hasPaidSubscriptionHistory(
  organizationId: string
): Promise<boolean> {
  if (!autumn) {
    return true;
  }

  try {
    const customer = await autumn.customers.getOrCreate({
      customerId: organizationId,
    });

    const hasHistory = customer.subscriptions.some(
      (subscription) =>
        !subscription.addOn && PAID_OR_LEGACY_PLAN_IDS.has(subscription.planId)
    );

    if (hasHistory) {
      return true;
    }

    return await hasAiCreditsGrant(organizationId);
  } catch {
    return true;
  }
}

export type GeoEntitlementOutcome = "entitled" | "denied" | "skipped";

/**
 * Resolves the AI-answers entitlement without emitting denial telemetry.
 * Confirm membership before calling: this lookup can contact the billing provider.
 */
export async function resolveGeoEntitlement(
  organizationId: string,
  headers?: Headers
): Promise<GeoEntitlementOutcome> {
  if (allowUnmeteredAiInDevelopment) {
    return "skipped";
  }

  if (!autumn) {
    if (process.env.NODE_ENV === "production") {
      throw internalServerError("Billing is not configured");
    }
    return "skipped";
  }

  try {
    const memo = headers ? getORPCRequestMemo(headers) : undefined;
    let outcome = memo?.geoEntitlementByOrganization.get(organizationId);
    if (!outcome) {
      outcome = Effect.runPromise(
        Cache.get(geoEntitlementCache, organizationId)
      );
      memo?.geoEntitlementByOrganization.set(organizationId, outcome);
    }
    return await outcome;
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }
    throw internalServerError("Failed to verify plan entitlement");
  }
}

/** Reports the denial and rejects the request. Call only for confirmed members. */
export async function rejectGeoEntitlementDenied(
  organizationId: string
): Promise<never> {
  trackServerEvent({
    event: POSTHOG_EVENTS.ENTITLEMENT_DENIED,
    organizationId,
    properties: {
      feature: ENTITLEMENT_FEATURES.AI_ANSWERS,
      surface: ENTITLEMENT_SURFACES.DASHBOARD,
    },
  });
  const tCommon = await getTranslations("common.messages");
  throw paymentRequired(tCommon("aiVisibilityTrackingIsIncluded"));
}

/** Call only after confirming organization membership. */
export async function assertGeoEntitlement(
  organizationId: string,
  headers?: Headers
): Promise<void> {
  const outcome = await resolveGeoEntitlement(organizationId, headers);
  if (outcome === "denied") {
    await rejectGeoEntitlementDenied(organizationId);
  }
}
