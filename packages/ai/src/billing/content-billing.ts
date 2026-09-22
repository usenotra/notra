import {
  AI_CREDIT_LIMIT_MESSAGE,
  AI_GENERATION_PLAN_REQUIRED_MESSAGE,
  CONTENT_BILLING_LOCK_PREFIX,
  CONTENT_BILLING_LOCK_TTL_MS,
  CONTENT_PLAN_REQUIRED_MESSAGE,
  CONTENT_QUOTA_FEATURES,
  CONTENT_QUOTA_LABELS,
  METERED_CONTENT_QUOTA_FEATURES,
} from "../constants/content-billing";
import { contentTypeSchema } from "../schemas/content";
import type {
  ConfirmContentBillingInput,
  ContentBillingDenialReason,
  ContentBillingFeatureId,
  ContentBillingReservation,
  ContentQuotaFeatureId,
  ReserveContentBillingInput,
} from "../types/billing";
import { calculateAiCreditCostCents } from "./ai-credit-cost";
import { allowUnmeteredAiInDevelopment, autumn } from "./autumn";
import { checkAutumnFeature, finalizeAutumnLock } from "./autumn-locks";
import {
  ACTIVE_PAID_PLAN_IDS,
  FEATURES,
  PAID_OR_LEGACY_PLAN_IDS,
} from "./features";
import { shouldApplyMarkup } from "./token-pricing";

const DEFAULT_FALLBACK_MODEL_ID = "anthropic/claude-sonnet-4.6";

const UNMETERED_RESERVATION: ContentBillingReservation = {
  allowed: true,
  mode: "unmetered",
  featureId: null,
  reserved: false,
  lockId: null,
  useMarkup: false,
};

/**
 * Active paid plans include product AI (personas, replay, sentiment) the
 * same way chat does. Nothing is reserved, so finalize is a no-op.
 */
const PLAN_INCLUDED_RESERVATION: ContentBillingReservation = {
  allowed: true,
  mode: "plan_included",
  featureId: null,
  reserved: false,
  lockId: null,
  useMarkup: false,
};

export function resolveContentQuotaFeature(
  outputType: string | null | undefined
): ContentQuotaFeatureId | null {
  const parsed = contentTypeSchema.safeParse(outputType);
  return parsed.success ? CONTENT_QUOTA_FEATURES[parsed.data] : null;
}

export function isMeteredContentQuotaFeature(
  featureId: ContentQuotaFeatureId
): boolean {
  return METERED_CONTENT_QUOTA_FEATURES.has(featureId);
}

function buildLockId(executionId: string, featureId: string): string {
  return `${CONTENT_BILLING_LOCK_PREFIX}:${executionId}:${featureId}`;
}

function normalizeReservation(
  reservation: ContentBillingReservation
): ContentBillingReservation {
  return {
    ...reservation,
    mode: reservation.mode ?? "ai_credits",
    featureId: reservation.featureId ?? FEATURES.AI_CREDITS,
  };
}

async function hasSubscription(
  organizationId: string,
  planIds: ReadonlySet<string>
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
      planIds.has(subscription.planId)
  );
}

function hasPaidSubscription(organizationId: string): Promise<boolean> {
  return hasSubscription(organizationId, PAID_OR_LEGACY_PLAN_IDS);
}

async function buildDenial(input: {
  organizationId: string;
  reason: ContentBillingDenialReason;
  featureId: ContentBillingFeatureId | null;
  balanceRemaining: number | null;
}): Promise<ContentBillingReservation> {
  const shouldNotify =
    input.reason === "no_entitlement"
      ? false
      : await hasPaidSubscription(input.organizationId);
  return {
    allowed: false,
    mode: "ai_credits",
    featureId: input.featureId,
    reserved: false,
    lockId: null,
    useMarkup: false,
    reason: input.reason,
    shouldNotify,
    balanceRemaining: input.balanceRemaining,
  };
}

export async function reserveContentBilling(
  input: ReserveContentBillingInput
): Promise<ContentBillingReservation> {
  if (!autumn || allowUnmeteredAiInDevelopment) {
    return UNMETERED_RESERVATION;
  }

  const lockTtlMs = input.lockTtlMs ?? CONTENT_BILLING_LOCK_TTL_MS;
  const countTowardQuota = input.countTowardQuota ?? true;
  const units = Math.max(1, Math.round(input.units ?? 1));
  const quotaFeature =
    input.quotaFeatureId ?? resolveContentQuotaFeature(input.outputType);

  let quotaExhausted = false;
  let quotaRemaining: number | null = null;

  if (quotaFeature) {
    const metered = isMeteredContentQuotaFeature(quotaFeature);
    const quotaLockId =
      metered && countTowardQuota && input.executionId
        ? buildLockId(input.executionId, quotaFeature)
        : null;
    const quota = await checkAutumnFeature({
      organizationId: input.organizationId,
      featureId: quotaFeature,
      requiredBalance: metered ? units : undefined,
      lockId: quotaLockId,
      lockTtlMs,
    });

    if (quota.duplicateLock || quota.response?.allowed) {
      return {
        allowed: true,
        mode: "plan_quota",
        featureId: quotaFeature,
        reserved: quotaLockId !== null,
        lockId: quotaLockId,
        useMarkup: false,
      };
    }

    const entitled =
      quota.response?.balance != null || quota.response?.flag != null;
    if (entitled) {
      quotaExhausted = true;
      quotaRemaining = quota.response?.balance?.remaining ?? 0;
    }
  }

  const creditLockId = input.executionId
    ? buildLockId(input.executionId, FEATURES.AI_CREDITS)
    : null;
  const credits = await checkAutumnFeature({
    organizationId: input.organizationId,
    featureId: FEATURES.AI_CREDITS,
    requiredBalance: 1,
    lockId: creditLockId,
    lockTtlMs,
  });

  if (credits.duplicateLock || credits.response?.allowed) {
    return {
      allowed: true,
      mode: "ai_credits",
      featureId: FEATURES.AI_CREDITS,
      reserved: creditLockId !== null,
      lockId: creditLockId,
      useMarkup: shouldApplyMarkup(credits.response?.balance ?? null),
    };
  }

  if (quotaExhausted && quotaFeature) {
    return buildDenial({
      organizationId: input.organizationId,
      reason: "quota_exhausted",
      featureId: quotaFeature,
      balanceRemaining: quotaRemaining,
    });
  }

  // No content quota (personas, replay, sentiment). Match chat: an active
  // paid plan still runs when credits are missing or at zero, and is not charged.
  if (
    !quotaFeature &&
    (await hasSubscription(input.organizationId, ACTIVE_PAID_PLAN_IDS))
  ) {
    return PLAN_INCLUDED_RESERVATION;
  }

  if (credits.response?.balance != null) {
    return buildDenial({
      organizationId: input.organizationId,
      reason: "insufficient_ai_credits",
      featureId: FEATURES.AI_CREDITS,
      balanceRemaining: credits.response.balance.remaining,
    });
  }

  return buildDenial({
    organizationId: input.organizationId,
    reason: "no_entitlement",
    featureId: quotaFeature,
    balanceRemaining: null,
  });
}

export async function checkContentBilling(input: {
  organizationId: string;
  outputType: string | null;
}): Promise<ContentBillingReservation> {
  return reserveContentBilling({
    organizationId: input.organizationId,
    outputType: input.outputType,
    countTowardQuota: false,
  });
}

export async function confirmContentBilling(
  input: ConfirmContentBillingInput
): Promise<void> {
  const reservation = normalizeReservation(input.reservation);
  if (!(autumn && reservation.lockId && reservation.reserved)) {
    return;
  }

  if (reservation.mode === "plan_quota") {
    const units = Math.max(1, Math.round(input.units ?? 1));
    await finalizeAutumnLock(
      reservation.lockId,
      "confirm",
      units,
      input.properties
    );
    return;
  }

  if (reservation.mode !== "ai_credits") {
    return;
  }

  const costCents = input.usage
    ? calculateAiCreditCostCents(
        input.usage,
        input.usage.modelId ??
          input.fallbackModelId ??
          DEFAULT_FALLBACK_MODEL_ID,
        reservation.useMarkup
      ).costCents
    : 1;
  await finalizeAutumnLock(
    reservation.lockId,
    "confirm",
    costCents,
    input.properties
  );
}

export async function releaseContentBilling(
  reservation: ContentBillingReservation
): Promise<void> {
  if (!(autumn && reservation.lockId)) {
    return;
  }
  await finalizeAutumnLock(reservation.lockId, "release");
}

export function getContentBillingLimitLabel(
  reservation: ContentBillingReservation
): string | undefined {
  if (reservation.reason !== "quota_exhausted") {
    return undefined;
  }
  const featureId = reservation.featureId;
  if (!featureId || featureId === FEATURES.AI_CREDITS) {
    return undefined;
  }
  return CONTENT_QUOTA_LABELS[featureId].plural;
}

export function describeContentBillingDenial(
  reservation: ContentBillingReservation
): string {
  if (reservation.reason === "quota_exhausted") {
    const label = getContentBillingLimitLabel(reservation) ?? "posts";
    return `You've used all the ${label} included in your plan this month. Upgrade your plan or add AI credits to keep creating.`;
  }
  if (reservation.reason === "no_entitlement") {
    const featureId = reservation.featureId;
    if (featureId && featureId !== FEATURES.AI_CREDITS) {
      return `Your plan doesn't include ${CONTENT_QUOTA_LABELS[featureId].plural}. Upgrade your plan or add AI credits to continue.`;
    }
    if (!featureId) {
      return AI_GENERATION_PLAN_REQUIRED_MESSAGE;
    }
    return CONTENT_PLAN_REQUIRED_MESSAGE;
  }
  return AI_CREDIT_LIMIT_MESSAGE;
}
