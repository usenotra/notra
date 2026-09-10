import { Autumn } from "autumn-js";
import { Effect } from "effect";
import type { Context, Next } from "hono";

import { API_PAYWALL_FEATURES } from "../constants/analytics";
import {
  AI_CREDITS_FEATURE_ID,
  RESTRICTED_BILLING_METHODS,
} from "../constants/billing";
import { checkSubscriptionAccess } from "../programs/subscription";
import { isIngestAuth } from "../types/auth";
import type {
  SubscriptionBillingChecker,
  SubscriptionMiddlewareOptions,
} from "../types/billing";
import { trackApiPaywalled } from "../utils/analytics";
import { getOrganizationId } from "../utils/auth";

// DELETE and GET are intentionally unrestricted so lapsed/unsubscribed orgs
// retain read access and data-deletion rights (GDPR / data portability).
export function subscriptionMiddleware(
  options: SubscriptionMiddlewareOptions = {}
) {
  return async (c: Context, next: Next) => {
    if (!RESTRICTED_BILLING_METHODS.has(c.req.method)) {
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

      console.error(
        "AUTUMN_SECRET_KEY is not configured — rejecting write request"
      );
      trackApiPaywalled(c, {
        feature: API_PAYWALL_FEATURES.SUBSCRIPTION,
        status: 503,
      });
      return c.json({ error: "Billing service unavailable" }, 503);
    }

    const orgId = getOrganizationId(c);
    if (!orgId) {
      return c.json(
        { error: "Forbidden: API key must be scoped to an organization" },
        403
      );
    }

    const billing: SubscriptionBillingChecker =
      options.billing ?? createAutumnBillingChecker(secretKey);
    const access = await Effect.runPromise(
      Effect.result(
        checkSubscriptionAccess({ organizationId: orgId, secretKey }, billing)
      )
    );

    if (access._tag === "Failure") {
      return c.json({ error: "Failed to verify subscription status" }, 500);
    }

    if (!access.success) {
      trackApiPaywalled(c, {
        feature: API_PAYWALL_FEATURES.SUBSCRIPTION,
        status: 402,
      });
      return c.json({ error: "Active subscription required" }, 402);
    }

    return next();
  };
}

function createAutumnBillingChecker(
  secretKey: string
): SubscriptionBillingChecker {
  const autumn = new Autumn({ secretKey });
  return {
    getCustomer: ({ organizationId }) =>
      autumn.customers.getOrCreate({
        customerId: organizationId,
      }),
    checkCredits: async ({ organizationId }) => {
      const check = await autumn.check({
        customerId: organizationId,
        featureId: AI_CREDITS_FEATURE_ID,
        requiredBalance: 1,
      });
      return check.allowed === true;
    },
  };
}
