import { FEATURES } from "@notra/ai/billing/features";
import { shouldBypassAutumnInDevelopment } from "@notra/ai/utils/autumn-development";

const DEVELOPMENT_BALANCE = Number.MAX_SAFE_INTEGER;

function createDevelopmentAutumnCustomer() {
  return {
    id: "development",
    name: "Local development",
    email: null,
    createdAt: 0,
    fingerprint: null,
    stripeId: null,
    env: "sandbox",
    metadata: {},
    sendEmailReceipts: false,
    billingControls: {},
    subscriptions: [],
    purchases: [],
    licenses: [],
    balances: Object.fromEntries(
      Object.values(FEATURES).map((featureId) => [
        featureId,
        {
          featureId,
          feature: {
            id: featureId,
            name: featureId,
            type: "metered",
            consumable: true,
            archived: false,
          },
          granted: DEVELOPMENT_BALANCE,
          remaining: DEVELOPMENT_BALANCE,
          usage: 0,
          unlimited: true,
          overageAllowed: false,
          maxPurchase: null,
          nextResetAt: null,
        },
      ])
    ),
    flags: {},
  };
}

export function createDevelopmentAutumnHandler(
  nodeEnv: string | undefined,
  secretKey: string | undefined
): ((request: Request) => Response) | null {
  if (!shouldBypassAutumnInDevelopment(nodeEnv, secretKey)) {
    return null;
  }

  return (request) => {
    const route = new URL(request.url).pathname.split("/").at(-1);

    if (route === "getOrCreateCustomer") {
      return Response.json(createDevelopmentAutumnCustomer());
    }

    return Response.json(
      { error: "Billing operations are unavailable without an Autumn key" },
      { status: 503 }
    );
  };
}
