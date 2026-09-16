import { Effect } from "effect";
import type { Context, Next } from "hono";

import { API_PAYWALL_FEATURES } from "../constants/analytics";
import { FEEDBACK_PLAN_REQUIRED_ERROR } from "../constants/feedback";
import { ORGANIZATION_SCOPED_API_KEY_ERROR } from "../constants/skills";
import { billingLayer, type BillingMiddlewareOptions } from "../lib/billing";
import { checkFeedbackEntitlement } from "../programs/feedback-entitlement";
import { isIngestAuth } from "../types/auth";
import { trackApiPaywalled } from "../utils/analytics";
import { getOrganizationId } from "../utils/auth";
import { isPublicFeedbackIngestRequest } from "../utils/feedback";
import { logError } from "../utils/logging";

export type FeedbackEntitlementMiddlewareOptions = BillingMiddlewareOptions;

/**
 * Requires the `feedback` feature entitlement on authenticated feedback
 * endpoints — reads included. The feature ships on every plan, the default
 * free product included, so the check is an on/off gate rather than a paywall:
 * it lets billing pull or grant the feature per product without a deploy.
 *
 * Two callers are intentionally exempt: `POST /v1/feedback/{slug}` is the
 * unauthenticated public ingest URL (rate limiting is its control), and `nfb_`
 * ingest tokens are scoped write-only credentials the organization issued
 * itself — `subscriptionMiddleware` already bypasses them for the same reason.
 *
 * Outside local development, fails closed: a missing key or an Autumn outage
 * is a 503, never an implicit grant.
 */
export function feedbackEntitlementMiddleware(
  options: FeedbackEntitlementMiddlewareOptions = {}
) {
  return async (c: Context, next: Next) => {
    if (
      isPublicFeedbackIngestRequest(new URL(c.req.url).pathname, c.req.method)
    ) {
      return next();
    }

    if (isIngestAuth(c.get("auth"))) {
      return next();
    }

    const secretKey = c.env.AUTUMN_SECRET_KEY as string | undefined;
    if (!secretKey) {
      if (process.env.NODE_ENV === "development") {
        return next();
      }

      logError(
        "AUTUMN_SECRET_KEY is not configured — rejecting feedback request",
        new Error("Missing AUTUMN_SECRET_KEY")
      );
      trackApiPaywalled(c, {
        feature: API_PAYWALL_FEATURES.AGENT_FEEDBACK,
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
        checkFeedbackEntitlement({ organizationId: orgId, secretKey }).pipe(
          Effect.provide(layer)
        )
      )
    );
    if (entitlement._tag === "Failure") {
      logError(
        "Failed to verify feedback plan entitlement",
        entitlement.failure.cause
      );
      trackApiPaywalled(c, {
        feature: API_PAYWALL_FEATURES.AGENT_FEEDBACK,
        status: 503,
      });
      return c.json({ error: "Billing service unavailable" }, 503);
    }

    if (!entitlement.success) {
      trackApiPaywalled(c, {
        feature: API_PAYWALL_FEATURES.AGENT_FEEDBACK,
        status: 402,
      });
      return c.json({ error: FEEDBACK_PLAN_REQUIRED_ERROR }, 402);
    }

    return next();
  };
}
