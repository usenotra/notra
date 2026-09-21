import {
  GITHUB_MENTION_BILLING_LOCK_PREFIX,
  GITHUB_MENTION_BILLING_LOCK_TTL_MS,
  GITHUB_MENTION_BILLING_SOURCE,
  GITHUB_MENTION_CREDITS_EXHAUSTED_MESSAGE,
  GITHUB_MENTION_MINIMUM_CREDITS,
  GITHUB_MENTION_NO_ENTITLEMENT_MESSAGE,
} from "../constants/github-mention-billing";
import type { AgentTokenUsage } from "../types/agents";
import type { GitHubMentionBillingReservation } from "../types/billing";
import { calculateAiCreditCostCents } from "./ai-credit-cost";
import { allowUnmeteredAiInDevelopment, autumn } from "./autumn";
import { checkAutumnFeature, finalizeAutumnLock } from "./autumn-locks";
import { FEATURES } from "./features";
import { shouldApplyMarkup } from "./token-pricing";

const UNMETERED_RESERVATION: GitHubMentionBillingReservation = {
  allowed: true,
  mode: "unmetered",
  featureId: null,
  lockId: null,
  useMarkup: false,
};

/** Accumulates usage reported once per completed model call. */
export function createGitHubMentionUsageCollector() {
  let usage: AgentTokenUsage | null = null;

  return {
    add(next: AgentTokenUsage) {
      const previousCost = usage?.tokenCostUsd ?? usage?.totalUsd;
      const nextCost = next.tokenCostUsd ?? next.totalUsd;
      const totalCost =
        previousCost === undefined || nextCost === undefined
          ? undefined
          : previousCost + nextCost;
      usage = usage
        ? {
            inputTokens: usage.inputTokens + next.inputTokens,
            outputTokens: usage.outputTokens + next.outputTokens,
            totalTokens: usage.totalTokens + next.totalTokens,
            cacheReadTokens: usage.cacheReadTokens + next.cacheReadTokens,
            cacheWriteTokens: usage.cacheWriteTokens + next.cacheWriteTokens,
            reasoningTokens:
              (usage.reasoningTokens ?? 0) + (next.reasoningTokens ?? 0),
            computeMs:
              usage.computeMs === undefined && next.computeMs === undefined
                ? undefined
                : (usage.computeMs ?? 0) + (next.computeMs ?? 0),
            modelId: next.modelId ?? usage.modelId,
            maxPromptTokens: Math.max(
              usage.maxPromptTokens ?? 0,
              next.maxPromptTokens ?? 0
            ),
            tokenCostUsd: totalCost,
            totalUsd: totalCost,
            route: next.route ?? usage.route,
          }
        : { ...next };
    },
    get(): AgentTokenUsage | null {
      return usage;
    },
  };
}

function buildLockId(mentionKey: string, featureId: string) {
  return `${GITHUB_MENTION_BILLING_LOCK_PREFIX}:${mentionKey}:${featureId}`;
}

/**
 * Holds balance for one mention before the agent starts, so two comments
 * arriving together cannot both spend the last credit and a redelivery of the
 * same comment reuses the hold instead of paying twice. The plan's pull
 * request credits go first; once they are gone the organization's AI credits
 * keep the bot answering instead of leaving it dead until the month resets.
 */
export async function reserveGitHubMentionBilling(input: {
  organizationId: string;
  /** Webhook delivery id, or the comment id when GitHub sent no delivery. */
  mentionKey: string;
}): Promise<GitHubMentionBillingReservation> {
  if (!autumn || allowUnmeteredAiInDevelopment) {
    return UNMETERED_RESERVATION;
  }

  const lockTtlMs = GITHUB_MENTION_BILLING_LOCK_TTL_MS;
  const planLockId = buildLockId(
    input.mentionKey,
    FEATURES.PULL_REQUEST_CREDITS
  );
  const plan = await checkAutumnFeature({
    organizationId: input.organizationId,
    featureId: FEATURES.PULL_REQUEST_CREDITS,
    requiredBalance: GITHUB_MENTION_MINIMUM_CREDITS,
    lockId: planLockId,
    lockTtlMs,
  });

  if (plan.duplicateLock || plan.response?.allowed) {
    return {
      allowed: true,
      mode: "pull_request_credits",
      featureId: FEATURES.PULL_REQUEST_CREDITS,
      lockId: planLockId,
      // Plan credits reset every month, so they never carry the top-up markup.
      useMarkup: false,
    };
  }

  const planBalance = plan.response?.balance ?? null;

  const creditLockId = buildLockId(input.mentionKey, FEATURES.AI_CREDITS);
  const credits = await checkAutumnFeature({
    organizationId: input.organizationId,
    featureId: FEATURES.AI_CREDITS,
    requiredBalance: GITHUB_MENTION_MINIMUM_CREDITS,
    lockId: creditLockId,
    lockTtlMs,
  });

  if (credits.duplicateLock || credits.response?.allowed) {
    // A duplicate lock answers without a balance, so the markup the first
    // attempt decided on has to be read again. Defaulting it away would bill a
    // run paid from a top-up at the plan rate.
    const balance = credits.duplicateLock
      ? (
          await checkAutumnFeature({
            organizationId: input.organizationId,
            featureId: FEATURES.AI_CREDITS,
            lockId: null,
            lockTtlMs,
          })
        ).response?.balance
      : credits.response?.balance;
    return {
      allowed: true,
      mode: "ai_credits",
      featureId: FEATURES.AI_CREDITS,
      lockId: creditLockId,
      useMarkup: shouldApplyMarkup(balance ?? null),
    };
  }

  if (planBalance) {
    return {
      allowed: false,
      mode: "pull_request_credits",
      featureId: FEATURES.PULL_REQUEST_CREDITS,
      lockId: null,
      useMarkup: false,
      reason: "pull_request_credits_exhausted",
      balanceRemaining: planBalance.remaining,
    };
  }

  const creditBalance = credits.response?.balance ?? null;
  return {
    allowed: false,
    mode: "ai_credits",
    featureId: creditBalance ? FEATURES.AI_CREDITS : null,
    lockId: null,
    useMarkup: false,
    reason: creditBalance ? "insufficient_ai_credits" : "no_entitlement",
    balanceRemaining: creditBalance?.remaining ?? null,
  };
}

/**
 * Deducts what the run actually cost. Without usage the run still spent model
 * calls somewhere, so it pays the minimum rather than nothing.
 */
export async function confirmGitHubMentionBilling(input: {
  reservation: GitHubMentionBillingReservation;
  usage: AgentTokenUsage | null;
  properties?: Record<string, string | number | boolean>;
}): Promise<void> {
  const { reservation } = input;
  if (!(autumn && reservation.lockId)) {
    return;
  }
  const cost = input.usage
    ? calculateAiCreditCostCents(
        input.usage,
        input.usage.modelId,
        reservation.useMarkup
      )
    : null;
  const costCents = Math.max(
    GITHUB_MENTION_MINIMUM_CREDITS,
    cost?.costCents ?? GITHUB_MENTION_MINIMUM_CREDITS
  );
  await finalizeAutumnLock(reservation.lockId, "confirm", costCents, {
    source: GITHUB_MENTION_BILLING_SOURCE,
    feature: reservation.featureId ?? FEATURES.AI_CREDITS,
    cost_cents: costCents,
    ...(cost ? { billing_basis: cost.billingBasis } : {}),
    ...(input.usage?.modelId ? { model: input.usage.modelId } : {}),
    ...(input.usage ? { total_tokens: input.usage.totalTokens } : {}),
    ...input.properties,
  });
}

/** Gives the hold back when the run never reached the model. */
export async function releaseGitHubMentionBilling(
  reservation: GitHubMentionBillingReservation
): Promise<void> {
  if (!(autumn && reservation.lockId)) {
    return;
  }
  await finalizeAutumnLock(reservation.lockId, "release");
}

/** What the bot answers on the pull request when it may not spend anything. */
export function describeGitHubMentionBillingDenial(
  reservation: GitHubMentionBillingReservation
): string {
  return reservation.reason === "no_entitlement"
    ? GITHUB_MENTION_NO_ENTITLEMENT_MESSAGE
    : GITHUB_MENTION_CREDITS_EXHAUSTED_MESSAGE;
}
