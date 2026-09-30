import type { ChatBillingCheck } from "../types/billing";
import { allowUnmeteredAiInDevelopment, autumn } from "./autumn";
import { ACTIVE_PAID_PLAN_IDS, FEATURES } from "./features";
import { shouldApplyMarkup } from "./token-pricing";

const UNMETERED_CHAT: ChatBillingCheck = {
  allowed: true,
  mode: "unmetered",
  chargeAiCredits: false,
  useMarkup: false,
  balanceRemaining: null,
};

export async function hasActivePaidPlan(
  organizationId: string
): Promise<boolean> {
  if (!autumn) {
    return false;
  }
  const customer = await autumn.customers.getOrCreate({
    customerId: organizationId,
  });
  return customer.subscriptions.some(
    (subscription) =>
      !subscription.addOn &&
      subscription.status === "active" &&
      ACTIVE_PAID_PLAN_IDS.has(subscription.planId)
  );
}

export async function checkChatBilling(
  organizationId: string
): Promise<ChatBillingCheck> {
  if (!autumn || allowUnmeteredAiInDevelopment) {
    return UNMETERED_CHAT;
  }

  const credits = await autumn.check({
    customerId: organizationId,
    featureId: FEATURES.AI_CREDITS,
    requiredBalance: 1,
  });
  const balanceRemaining =
    typeof credits.balance?.remaining === "number"
      ? credits.balance.remaining
      : null;

  if (credits.allowed) {
    return {
      allowed: true,
      mode: "ai_credits",
      chargeAiCredits: true,
      useMarkup: shouldApplyMarkup(credits.balance ?? null),
      balanceRemaining,
    };
  }

  if (await hasActivePaidPlan(organizationId)) {
    return {
      allowed: true,
      mode: "plan_included",
      chargeAiCredits: false,
      useMarkup: false,
      balanceRemaining,
    };
  }

  return {
    allowed: false,
    mode: "ai_credits",
    chargeAiCredits: false,
    useMarkup: false,
    balanceRemaining,
  };
}
