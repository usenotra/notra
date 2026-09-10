import {
  allowUnmeteredAiInDevelopment,
  autumn,
  AUTUMN_READ_TIMEOUT_MS,
} from "@notra/ai/billing/autumn";
import { FEATURES, PAID_OR_LEGACY_PLAN_IDS } from "@notra/ai/billing/features";
import type { GeoZdrEntitlement } from "@notra/geo-core/types/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { ORPCError } from "@orpc/server";

import {
  ENTITLEMENT_FEATURES,
  ENTITLEMENT_SURFACES,
} from "@/constants/analytics-events";
import { GEO_PLAN_REQUIRED_MESSAGE } from "@/constants/billing";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { getORPCRequestMemo } from "@/lib/orpc/context";
import { internalServerError, paymentRequired } from "@/lib/orpc/utils/errors";

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

/**
 * Non-throwing lookup of the zero data retention entitlement, granted by the
 * ZDR add-on on any plan. Development without billing counts as entitled; a
 * billing outage answers `unknown` so each gate can decide how to fail.
 */
export async function resolveZdrEntitlement(
  organizationId: string
): Promise<GeoZdrEntitlement> {
  if (allowUnmeteredAiInDevelopment) {
    return "entitled";
  }
  if (!autumn) {
    return process.env.NODE_ENV === "production" ? "not_entitled" : "entitled";
  }
  try {
    const data = await autumn.check(
      {
        customerId: organizationId,
        featureId: FEATURES.ZDR,
      },
      { timeoutMs: AUTUMN_READ_TIMEOUT_MS }
    );
    return data.allowed === true ? "entitled" : "not_entitled";
  } catch {
    return "unknown";
  }
}

export async function assertActiveSubscription(
  organizationId: string,
  procedure?: string
): Promise<void> {
  if (allowUnmeteredAiInDevelopment) {
    return;
  }

  if (!autumn) {
    if (process.env.NODE_ENV === "production") {
      throw internalServerError("Billing is not configured");
    }
    return;
  }

  let hasAccess = false;
  let activePlanId: string | null = null;

  try {
    const customer = await autumn.customers.getOrCreate({
      customerId: organizationId,
    });

    activePlanId =
      customer.subscriptions.find(
        (subscription) =>
          !subscription.addOn && subscription.status === "active"
      )?.planId ?? null;

    hasAccess = customer.subscriptions.some(
      (subscription) =>
        !subscription.addOn &&
        subscription.status === "active" &&
        PAID_OR_LEGACY_PLAN_IDS.has(subscription.planId)
    );

    if (!hasAccess) {
      hasAccess = await hasAiCreditsBalance(organizationId);
    }
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }
    throw internalServerError("Failed to verify subscription status");
  }

  if (!hasAccess) {
    trackServerEvent({
      event: POSTHOG_EVENTS.SUBSCRIPTION_REQUIRED_HIT,
      organizationId,
      properties: { procedure: procedure ?? null, plan_id: activePlanId },
    });
    throw paymentRequired("Active subscription required");
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
      outcome = checkAiAnswersEntitlement(organizationId).then((data) =>
        data?.balance != null ? "entitled" : "denied"
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
export function rejectGeoEntitlementDenied(organizationId: string): never {
  trackServerEvent({
    event: POSTHOG_EVENTS.ENTITLEMENT_DENIED,
    organizationId,
    properties: {
      feature: ENTITLEMENT_FEATURES.AI_ANSWERS,
      surface: ENTITLEMENT_SURFACES.DASHBOARD,
    },
  });
  throw paymentRequired(GEO_PLAN_REQUIRED_MESSAGE);
}

/** Call only after confirming organization membership. */
export async function assertGeoEntitlement(
  organizationId: string,
  headers?: Headers
): Promise<void> {
  const outcome = await resolveGeoEntitlement(organizationId, headers);
  if (outcome === "denied") {
    rejectGeoEntitlementDenied(organizationId);
  }
}
