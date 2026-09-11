import { Effect } from "effect";
import type { Context, Next } from "hono";

import { API_PAYWALL_FEATURES } from "../constants/analytics";
import {
  GEO_PLAN_REQUIRED_MESSAGE,
  ORGANIZATION_SCOPED_API_KEY_ERROR,
} from "../constants/geo";
import { billingLayer, type BillingMiddlewareOptions } from "../lib/billing";
import { checkGeoEntitlement } from "../programs/geo-entitlement";
import { trackApiPaywalled } from "../utils/analytics";
import { getOrganizationId } from "../utils/auth";
import { logError } from "../utils/logging";

export type GeoEntitlementMiddlewareOptions = BillingMiddlewareOptions;

/**
 * Requires the GEO plan entitlement on every GEO endpoint, reads included.
 *
 * Mirrors the dashboard's `assertGeoEntitlement`: a customer is entitled when
 * it has an `ai_answers` balance *at all* (`balance != null`), which is a plan
 * check rather than a quota check — a caller that has burned through its
 * allowance still gets 200s here, same as in the product.
 *
 * Reads are gated too. The dashboard gates them through `geoHandler`, and GEO
 * data is the paid deliverable, so a read-only API key on a lapsed plan must
 * not keep draining the dataset. This is deliberately stricter than
 * `subscriptionMiddleware`, which leaves GET and DELETE open for data
 * portability; that middleware still applies unchanged on top of this one.
 *
 * Outside local development, fails closed: a missing key or an Autumn outage
 * is a 503, never an implicit grant.
 */
export function geoEntitlementMiddleware(
  options: GeoEntitlementMiddlewareOptions = {}
) {
  return async (c: Context, next: Next) => {
    const secretKey = c.env.AUTUMN_SECRET_KEY as string | undefined;
    if (!secretKey) {
      if (process.env.NODE_ENV === "development") {
        return next();
      }

      logError(
        "AUTUMN_SECRET_KEY is not configured — rejecting GEO request",
        new Error("Missing AUTUMN_SECRET_KEY")
      );
      trackApiPaywalled(c, {
        feature: API_PAYWALL_FEATURES.AI_ANSWERS,
        status: 503,
      });
      return c.json({ error: "Billing service unavailable" }, 503);
    }

    const orgId = getOrganizationId(c);
    if (!orgId) {
      return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
    }

    const layer = options.billingLayer ?? billingLayer(secretKey);
    const entitlement = await Effect.runPromise(
      Effect.result(
        checkGeoEntitlement({ organizationId: orgId, secretKey }).pipe(
          Effect.provide(layer)
        )
      )
    );
    if (entitlement._tag === "Failure") {
      logError(
        "Failed to verify GEO plan entitlement",
        entitlement.failure.cause
      );
      trackApiPaywalled(c, {
        feature: API_PAYWALL_FEATURES.AI_ANSWERS,
        status: 503,
      });
      return c.json({ error: "Billing service unavailable" }, 503);
    }

    if (!entitlement.success) {
      trackApiPaywalled(c, {
        feature: API_PAYWALL_FEATURES.AI_ANSWERS,
        status: 402,
      });
      return c.json({ error: GEO_PLAN_REQUIRED_MESSAGE }, 402);
    }

    return next();
  };
}
